import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tickets, spareParts, ticketSpareParts } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { eq, and } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

function isAuthorized(request: Request) {
  const role = request.headers.get('x-user-role');
  return role === 'ADMIN' || role === 'TECH';
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const ticketId = Number(params.id);
    const db = getDb();
    
    const partsUsed = await db
      .select({
        id: ticketSpareParts.id,
        partId: ticketSpareParts.partId,
        partName: spareParts.name,
        partNumber: spareParts.partNumber,
        quantity: ticketSpareParts.quantity,
        usedAt: ticketSpareParts.usedAt,
      })
      .from(ticketSpareParts)
      .innerJoin(spareParts, eq(ticketSpareParts.partId, spareParts.id))
      .where(eq(ticketSpareParts.ticketId, ticketId));

    return NextResponse.json(partsUsed);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ticketId = Number(params.id);
    const { partId, quantity } = ((await request.json() as any)) as any;
    const qty = Number(quantity);

    if (!partId || isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Invalid partId or quantity' }, { status: 400 });
    }

    const db = getDb();

    // 1. Verify ticket exists
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
    });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // 2. Verify spare part exists and check stock
    const part = await db.query.spareParts.findFirst({
      where: eq(spareParts.id, Number(partId)),
    });
    if (!part) {
      return NextResponse.json({ error: 'Spare part not found' }, { status: 404 });
    }

    if (part.quantity < qty) {
      return NextResponse.json({ error: `Not enough stock. Available: ${part.quantity}, Requested: ${qty}` }, { status: 400 });
    }

    // 3. Subtract stock and log usage
    // Update spare part stock
    await db
      .update(spareParts)
      .set({ quantity: part.quantity - qty })
      .where(eq(spareParts.id, part.id));

    // Record in ticketSpareParts
    await db.insert(ticketSpareParts).values({
      ticketId,
      partId: part.id,
      quantity: qty,
    });

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'CONSUME_SPARE_PART',
      details: `Consumed ${qty} units of ${part.name} on ticket ${ticket.ticketNo}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
