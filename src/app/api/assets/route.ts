import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { assets, users } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { desc, eq } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

function isAuthorized(request: Request) {
  const role = request.headers.get('x-user-role');
  return role === 'ADMIN' || role === 'TECH';
}

export async function GET(request: Request) {
  try {
    const userId = Number(request.headers.get('x-user-id'));
    const userRole = request.headers.get('x-user-role');
    const db = getDb();
    
    // Left join with users to get the assigned user's name
    let baseQuery = db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        name: assets.name,
        serialNumber: assets.serialNumber,
        category: assets.category,
        status: assets.status,
        assignedToUserId: assets.assignedToUserId,
        assignedToUserName: users.name,
        assignedToUserEmail: users.email,
        assignedToUserDepartmentId: users.departmentId,
        purchaseDate: assets.purchaseDate,
        purchaseCost: assets.purchaseCost,
        imagesJson: assets.imagesJson,
        createdAt: assets.createdAt,
      })
      .from(assets)
      .leftJoin(users, eq(assets.assignedToUserId, users.id));

    let allAssets: any[] = [];
    if (userRole === 'USER') {
      allAssets = await baseQuery.where(eq(assets.assignedToUserId, userId)).orderBy(desc(assets.createdAt));
    } else {
      allAssets = await baseQuery.orderBy(desc(assets.createdAt));
    }

    return NextResponse.json(allAssets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { assetTag, name, serialNumber, category, status, assignedToUserId, purchaseDate, purchaseCost, imagesJson } = ((await request.json() as any)) as any;
    
    if (!assetTag || !name || !category) {
      return NextResponse.json({ error: 'Missing required fields (assetTag, name, category)' }, { status: 400 });
    }

    const db = getDb();
    
    // Check if assetTag is unique
    const existing = await db.query.assets.findFirst({
      where: eq(assets.assetTag, assetTag.toUpperCase().trim()),
    });

    if (existing) {
      return NextResponse.json({ error: `Asset Tag ${assetTag} already exists` }, { status: 400 });
    }

    const [newAsset] = await db.insert(assets).values({
      assetTag: assetTag.toUpperCase().trim(),
      name,
      serialNumber: serialNumber || null,
      category,
      status: status || 'Active',
      assignedToUserId: assignedToUserId ? Number(assignedToUserId) : null,
      purchaseDate: purchaseDate || null,
      purchaseCost: purchaseCost ? Number(purchaseCost) : null,
      imagesJson: imagesJson || null,
    }).returning();

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'CREATE_ASSET',
      details: `Created asset tag: ${newAsset.assetTag}, name: ${newAsset.name}`,
    });

    return NextResponse.json(newAsset, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
