import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { pmPlans, pmLogs, tickets, assets, users } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { sendNotification } from '@/lib/notification';
import { eq } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const { pmPlanId } = ((await request.json() as any)) as any;
    if (!pmPlanId) {
      return NextResponse.json({ error: 'Missing pmPlanId' }, { status: 400 });
    }

    const db = getDb();

    // 1. Fetch PM Plan and linked asset
    const plan = await db.query.pmPlans.findFirst({
      where: eq(pmPlans.id, Number(pmPlanId)),
    });
    if (!plan) {
      return NextResponse.json({ error: 'PM Plan not found' }, { status: 404 });
    }

    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, plan.assetId),
    });
    if (!asset) {
      return NextResponse.json({ error: 'Asset linked to PM Plan not found' }, { status: 404 });
    }

    // Parse checklist
    let checklist: string[] = [];
    try {
      checklist = JSON.parse(plan.checklistJson);
    } catch (e) {}

    // Form description from checklist
    const description = `งานบำรุงรักษาเชิงป้องกันตามแผน: "${plan.planName}"\nทรัพย์สิน: ${asset.name} (${asset.assetTag})\n\nรายการตรวจสอบ (Checklist):\n` + 
      checklist.map((item, i) => `[ ] ${i + 1}. ${item}`).join('\n');

    // 2. Create PM Ticket
    // Generate ticket number: PM-TCK-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const ticketCountResult = await db.select({ id: tickets.id }).from(tickets);
    const nextSeq = String(ticketCountResult.length + 1).padStart(4, '0');
    const ticketNo = `TCK-PM-${dateStr}-${nextSeq}`;

    // Admin user id as reporter, or system fallback (ID: 1)
    const actorId = Number(request.headers.get('x-user-id')) || 1;

    const [newTicket] = await db.insert(tickets).values({
      ticketNo,
      title: `[PM WORK] ${plan.planName} - ${asset.assetTag}`,
      description,
      priority: 'Medium',
      status: 'Open',
      reporterId: actorId, // Opened by actor or system
      assetId: asset.id,
    }).returning();

    // 3. Log in pmLogs
    await db.insert(pmLogs).values({
      pmPlanId: plan.id,
      ticketId: newTicket.id,
      executionDate: today.toISOString().slice(0, 10),
      status: 'Pending',
    });

    // 4. Update PM Plan next due date
    let monthsToAdd = 1;
    if (plan.frequency === 'Quarterly') monthsToAdd = 3;
    if (plan.frequency === 'Yearly') monthsToAdd = 12;
    const newDueDate = addMonths(plan.nextDueDate, monthsToAdd);

    await db
      .update(pmPlans)
      .set({ nextDueDate: newDueDate })
      .where(eq(pmPlans.id, plan.id));

    // Audit log
    await writeAuditLog({
      userId: actorId,
      action: 'TRIGGER_PM_PLAN',
      details: `Triggered PM Plan: ${plan.planName} -> Generated Ticket: ${ticketNo}. Next due date: ${newDueDate}`,
    });

    // Notification
    try {
      await sendNotification({
        title: `🗓️ งาน PM อัตโนมัติเปิดใหม่: ${ticketNo}`,
        message: `แผนงาน: ${plan.planName}\nทรัพย์สิน: ${asset.name} (${asset.assetTag})\nกรุณาเข้าตรวจเช็คตามเช็กลิสต์ในระบบ`,
        recipientRole: 'TECH',
      });
    } catch (e) {
      console.error('Notification failed:', e);
    }

    return NextResponse.json({ success: true, ticket: newTicket });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
