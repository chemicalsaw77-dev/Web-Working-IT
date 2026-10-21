import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { departments } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { eq } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

function isAdmin(request: Request) {
  const role = request.headers.get('x-user-role');
  return role === 'ADMIN';
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = Number(params.id);
    const { name, approverUserId } = ((await request.json() as any)) as any;
    const db = getDb();

    const dept = await db.query.departments.findFirst({
      where: eq(departments.id, id),
    });

    if (!dept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    updateData.approverUserId = approverUserId ? Number(approverUserId) : null;

    await db.update(departments).set(updateData).where(eq(departments.id, id));

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'UPDATE_DEPARTMENT',
      details: `Updated department ID ${id} ("${name || dept.name}")`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = Number(params.id);
    const db = getDb();

    const dept = await db.query.departments.findFirst({
      where: eq(departments.id, id),
    });

    if (!dept) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    await db.delete(departments).where(eq(departments.id, id));

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'DELETE_DEPARTMENT',
      details: `Deleted department: "${dept.name}" (ID: ${id})`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
