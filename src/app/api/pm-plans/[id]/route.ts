import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { pmPlans } from '@/db/schema';
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
    const { planName, departmentId, assetId, frequency, nextDueDate, checklistJson } = ((await request.json() as any)) as any;
    const db = getDb();

    const plan = await db.query.pmPlans.findFirst({
      where: eq(pmPlans.id, id),
    });

    if (!plan) {
      return NextResponse.json({ error: 'PM Plan not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (planName) updateData.planName = planName;
    if (departmentId !== undefined) updateData.departmentId = departmentId ? Number(departmentId) : null;
    if (assetId) updateData.assetId = Number(assetId);
    if (frequency) updateData.frequency = frequency;
    if (nextDueDate) updateData.nextDueDate = nextDueDate;
    if (checklistJson) updateData.checklistJson = checklistJson;

    await db.update(pmPlans).set(updateData).where(eq(pmPlans.id, id));

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'UPDATE_PM_PLAN',
      details: `Updated PM plan ID ${id} (${planName || plan.planName})`,
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

    const plan = await db.query.pmPlans.findFirst({
      where: eq(pmPlans.id, id),
    });

    if (!plan) {
      return NextResponse.json({ error: 'PM Plan not found' }, { status: 404 });
    }

    await db.delete(pmPlans).where(eq(pmPlans.id, id));

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'DELETE_PM_PLAN',
      details: `Deleted PM plan: ${plan.planName} (ID: ${id})`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
