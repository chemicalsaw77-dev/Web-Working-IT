import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { pmPlans, pmLogs, tickets, assets } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { sendNotification } from '@/lib/notification';
import { lte, eq } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    // 1. Authorize using CRON_SECRET key to prevent public trigger
    const { searchParams } = new URL(request.url);
    const clientSecret = searchParams.get('secret') || request.headers.get('Authorization')?.replace('Bearer ', '');
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret-key-change-this';

    if (clientSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const todayStr = new Date().toISOString().slice(0, 10);

    // 2. Fetch all PM plans that are due (nextDueDate <= today)
    const duePlans = await db
      .select({
        id: pmPlans.id,
        planName: pmPlans.planName,
        assetId: pmPlans.assetId,
        frequency: pmPlans.frequency,
        nextDueDate: pmPlans.nextDueDate,
        checklistJson: pmPlans.checklistJson,
      })
      .from(pmPlans)
      .where(lte(pmPlans.nextDueDate, todayStr));

    const triggeredTickets = [];

    for (const plan of duePlans) {
      // Fetch asset details
      const asset = await db.query.assets.findFirst({
        where: eq(assets.id, plan.assetId),
      });

      if (!asset || asset.status !== 'Active') {
        continue; // Skip inactive assets or missing assets
      }

      // Parse checklist
      let checklist: string[] = [];
      try {
        checklist = JSON.parse(plan.checklistJson);
      } catch (e) {}

      const description = `งานบำรุงรักษาเชิงป้องกันตามแผน: "${plan.planName}"\nทรัพย์สิน: ${asset.name} (${asset.assetTag})\n\nรายการตรวจสอบ (Checklist):\n` + 
        checklist.map((item, i) => `[ ] ${i + 1}. ${item}`).join('\n');

      // Create PM Ticket
      const dateStr = todayStr.replace(/-/g, '');
      const ticketCountResult = await db.select({ id: tickets.id }).from(tickets);
      const nextSeq = String(ticketCountResult.length + 1).padStart(4, '0');
      const ticketNo = `TCK-PM-AUTO-${dateStr}-${nextSeq}`;

      const [newTicket] = await db.insert(tickets).values({
        ticketNo,
        title: `[PM AUTO] ${plan.planName} - ${asset.assetTag}`,
        description,
        priority: 'Medium',
        status: 'Open',
        reporterId: 1, // System User ID
        assetId: asset.id,
      }).returning();

      // Log in pmLogs
      await db.insert(pmLogs).values({
        pmPlanId: plan.id,
        ticketId: newTicket.id,
        executionDate: todayStr,
        status: 'Pending',
      });

      // Update next due date of PM Plan
      let monthsToAdd = 1;
      if (plan.frequency === 'Quarterly') monthsToAdd = 3;
      if (plan.frequency === 'Yearly') monthsToAdd = 12;
      const newDueDate = addMonths(plan.nextDueDate, monthsToAdd);

      await db
        .update(pmPlans)
        .set({ nextDueDate: newDueDate })
        .where(eq(pmPlans.id, plan.id));

      // Record audit log
      await writeAuditLog({
        userId: null, // System-triggered
        action: 'CRON_TRIGGER_PM',
        details: `Auto PM trigger for plan: ${plan.planName} -> Ticket: ${ticketNo}. Next due: ${newDueDate}`,
      });

      // Send Slack/LINE/Telegram alerts to techs
      try {
        await sendNotification({
          title: `🗓️ งาน PM อัตโนมัติเปิดใหม่: ${ticketNo}`,
          message: `แผนงาน: ${plan.planName}\nทรัพย์สิน: ${asset.name} (${asset.assetTag})\nกรุณาเข้าตรวจเช็คตามเช็กลิสต์ในระบบ`,
          recipientRole: 'TECH',
        });
      } catch (e) {
        console.error('Cron notification failed:', e);
      }

      triggeredTickets.push({ ticketNo, planName: plan.planName });
    }

    return NextResponse.json({
      success: true,
      processedCount: duePlans.length,
      triggeredTickets,
    });
  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
