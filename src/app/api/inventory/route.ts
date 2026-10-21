import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { spareParts } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { desc, eq } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

function isAuthorized(request: Request) {
  const role = request.headers.get('x-user-role');
  return role === 'ADMIN' || role === 'TECH';
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    const parts = await db
      .select()
      .from(spareParts)
      .orderBy(desc(spareParts.createdAt));

    return NextResponse.json(parts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, partNumber, quantity, minQuantity } = ((await request.json() as any)) as any;

    if (!name) {
      return NextResponse.json({ error: 'Missing required field (name)' }, { status: 400 });
    }

    const db = getDb();

    // Check unique partNumber
    if (partNumber) {
      const existing = await db.query.spareParts.findFirst({
        where: eq(spareParts.partNumber, partNumber.toUpperCase().trim()),
      });
      if (existing) {
        return NextResponse.json({ error: `Part Number ${partNumber} already exists` }, { status: 400 });
      }
    }

    const [newPart] = await db.insert(spareParts).values({
      name,
      partNumber: partNumber ? partNumber.toUpperCase().trim() : null,
      quantity: quantity ? Number(quantity) : 0,
      minQuantity: minQuantity ? Number(minQuantity) : 0,
    }).returning();

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'CREATE_SPARE_PART',
      details: `Created spare part: ${name} (Part No: ${partNumber || 'N/A'}, Qty: ${quantity})`,
    });

    return NextResponse.json(newPart, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
