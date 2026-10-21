import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tickets, users } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { sendNotification } from '@/lib/notification';
import { eq } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const actorId = Number(request.headers.get('x-user-id'));
    const actorRole = request.headers.get('x-user-role');
    const id = Number(params.id);
    
    const { title, description, priority, status, assigneeId, satisfactionRating, resolutionNote } = ((await request.json() as any)) as any;
    const db = getDb();

    // Check if ticket exists
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, id),
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (priority) updateData.priority = priority;
    
    // Status update logic
    let statusChanged = false;
    if (status && status !== ticket.status) {
      updateData.status = status;
      statusChanged = true;
      if (status === 'Resolved' || status === 'Closed') {
        updateData.resolvedAt = new Date().toISOString();
      }
    }

    // Assignee update logic
    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId ? Number(assigneeId) : null;
    }

    // Satisfaction Rating update logic (CSAT)
    if (satisfactionRating !== undefined) {
      updateData.satisfactionRating = Number(satisfactionRating);
    }

    // Resolution Note (closing comment)
    if (resolutionNote !== undefined) {
      updateData.resolutionNote = resolutionNote;
    }

    await db.update(tickets).set(updateData).where(eq(tickets.id, id));

    // Audit Log
    await writeAuditLog({
      userId: actorId,
      action: 'UPDATE_TICKET',
      details: `Updated ticket ${ticket.ticketNo} (Status: ${status || ticket.status}, Assignee: ${assigneeId || 'N/A'})`,
    });

    // Notifications
    if (statusChanged) {
      // Find reporter info
      const reporter = await db.query.users.findFirst({
        where: eq(users.id, ticket.reporterId),
      });

      if (reporter) {
        try {
          if (status === 'Open' && ticket.status === 'Pending_Approval') {
            // Approved
            await sendNotification({
              title: `🔔 ใบงานผ่านการอนุมัติ: ${ticket.ticketNo}`,
              message: `ใบแจ้งซ่อม "${ticket.title}" ของคุณได้รับการอนุมัติจากหัวหน้าแผนกแล้ว และส่งเข้าระบบของทีมไอทีเรียบร้อยแล้ว`,
              recipientUserId: reporter.id,
            });
            await sendNotification({
              title: `🔧 งานแจ้งซ่อมใหม่ (อนุมัติแล้ว): ${ticket.ticketNo}`,
              message: `เรื่อง: ${ticket.title}\nความสำคัญ: ${ticket.priority}\nผู้แจ้ง: ${reporter.name}\nรายละเอียด: ${ticket.description || '-'}`,
              recipientRole: 'TECH',
            });
          } else if (status === 'Closed' && ticket.status === 'Pending_Approval') {
            // Rejected
            await sendNotification({
              title: `❌ ใบงานไม่ได้รับการอนุมัติ: ${ticket.ticketNo}`,
              message: `ใบแจ้งซ่อม "${ticket.title}" ของคุณไม่ได้รับการอนุมัติจากหัวหน้าแผนก จึงถูกปฏิเสธและปิดงานลง`,
              recipientUserId: reporter.id,
            });
          } else {
            // Normal status updates
            let statusText = status;
            if (status === 'In_Progress') statusText = 'กำลังดำเนินการ (In Progress)';
            if (status === 'Resolved') statusText = 'แก้ไขเสร็จสิ้น (Resolved)';
            if (status === 'Closed') statusText = 'ปิดงานสำเร็จ (Closed)';

            await sendNotification({
              title: `🔔 อัปเดตสถานะงานซ่อม: ${ticket.ticketNo}`,
              message: `งานของคุณ: "${ticket.title}" ถูกเปลี่ยนสถานะเป็น [${statusText}]`,
              recipientUserId: reporter.id,
            });
          }
        } catch (e) {
          console.error('Notification failed:', e);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const actorRole = request.headers.get('x-user-role');
    if (actorRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = Number(params.id);
    const db = getDb();

    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, id),
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    await db.delete(tickets).where(eq(tickets.id, id));

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'DELETE_TICKET',
      details: `Deleted ticket ${ticket.ticketNo}: "${ticket.title}"`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
