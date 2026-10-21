import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { pmPlans, assets, departments, users, pmLogs, tickets } from '@/db/schema';
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
    
    // Join with assets, departments, and users to display plan information
    const plans = await db
      .select({
        id: pmPlans.id,
        planName: pmPlans.planName,
        departmentId: pmPlans.departmentId,
        departmentName: departments.name,
        assetId: pmPlans.assetId,
        assetTag: assets.assetTag,
        assetName: assets.name,
        assignedToUserName: users.name,
        frequency: pmPlans.frequency,
        nextDueDate: pmPlans.nextDueDate,
        checklistJson: pmPlans.checklistJson,
        createdAt: pmPlans.createdAt,
      })
      .from(pmPlans)
      .innerJoin(assets, eq(pmPlans.assetId, assets.id))
      .leftJoin(departments, eq(pmPlans.departmentId, departments.id))
      .leftJoin(users, eq(assets.assignedToUserId, users.id))
      .orderBy(desc(pmPlans.createdAt));

    // Fetch the latest ticket status for each plan
    const plansWithStatus = [];
    for (const plan of plans) {
      const latestLog = await db
        .select({
          status: tickets.status,
          ticketNo: tickets.ticketNo,
        })
        .from(pmLogs)
        .leftJoin(tickets, eq(pmLogs.ticketId, tickets.id))
        .where(eq(pmLogs.pmPlanId, plan.id))
        .orderBy(desc(pmLogs.id))
        .limit(1);

      plansWithStatus.push({
        ...plan,
        latestTicketStatus: latestLog[0]?.status || null,
        latestTicketNo: latestLog[0]?.ticketNo || null,
      });
    }

    return NextResponse.json(plansWithStatus);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { planName, departmentId, assetId, frequency, nextDueDate, checklistJson } = ((await request.json() as any)) as any;

    if (!planName || !assetId || !frequency || !nextDueDate || !checklistJson) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();
    const [newPlan] = await db.insert(pmPlans).values({
      planName,
      departmentId: departmentId ? Number(departmentId) : null,
      assetId: Number(assetId),
      frequency,
      nextDueDate,
      checklistJson,
    }).returning();

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'CREATE_PM_PLAN',
      details: `Created PM plan: ${planName} for Asset ID ${assetId} (Frequency: ${frequency})`,
    });

    return NextResponse.json(newPlan, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
