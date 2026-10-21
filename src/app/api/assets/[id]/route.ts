import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { assets } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { eq } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

function isAuthorized(request: Request) {
  const role = request.headers.get('x-user-role');
  return role === 'ADMIN' || role === 'TECH';
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = Number(params.id);
    const { name, serialNumber, category, status, assignedToUserId, purchaseDate, purchaseCost, imagesJson } = ((await request.json() as any)) as any;
    const db = getDb();

    // Check if asset exists
    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, id),
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber || null;
    if (category) updateData.category = category;
    if (status) updateData.status = status;
    if (assignedToUserId !== undefined) {
      updateData.assignedToUserId = assignedToUserId ? Number(assignedToUserId) : null;
    }
    if (purchaseDate !== undefined) updateData.purchaseDate = purchaseDate || null;
    if (purchaseCost !== undefined) {
      updateData.purchaseCost = purchaseCost ? Number(purchaseCost) : null;
    }
    if (imagesJson !== undefined) {
      updateData.imagesJson = imagesJson || null;
    }

    await db.update(assets).set(updateData).where(eq(assets.id, id));

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'UPDATE_ASSET',
      details: `Updated asset tag: ${asset.assetTag} (ID: ${id})`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = Number(params.id);
    const db = getDb();

    // Check if asset exists
    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, id),
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    await db.delete(assets).where(eq(assets.id, id));

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'DELETE_ASSET',
      details: `Deleted asset tag: ${asset.assetTag}, name: ${asset.name} (ID: ${id})`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
