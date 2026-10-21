import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { spareParts } from '@/db/schema';
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
    const { name, partNumber, quantity, minQuantity } = ((await request.json() as any)) as any;
    const db = getDb();

    const part = await db.query.spareParts.findFirst({
      where: eq(spareParts.id, id),
    });

    if (!part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (partNumber !== undefined) updateData.partNumber = partNumber ? partNumber.toUpperCase().trim() : null;
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (minQuantity !== undefined) updateData.minQuantity = Number(minQuantity);

    await db.update(spareParts).set(updateData).where(eq(spareParts.id, id));

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'UPDATE_SPARE_PART',
      details: `Updated spare part ID ${id} (${name || part.name}, Qty: ${quantity})`,
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

    const part = await db.query.spareParts.findFirst({
      where: eq(spareParts.id, id),
    });

    if (!part) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 });
    }

    await db.delete(spareParts).where(eq(spareParts.id, id));

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'DELETE_SPARE_PART',
      details: `Deleted spare part: ${part.name} (Part No: ${part.partNumber || 'N/A'}, ID: ${id})`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
