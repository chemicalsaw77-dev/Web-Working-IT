import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tickets, users, assets, departments } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { sendNotification } from '@/lib/notification'; // We will create this helper in Phase 6!
import { desc, eq, and, or } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

export async function GET(request: Request) {
  try {
    const userId = Number(request.headers.get('x-user-id'));
    const userRole = request.headers.get('x-user-role');
    const db = getDb();

    let query = db
      .select({
        id: tickets.id,
        ticketNo: tickets.ticketNo,
        title: tickets.title,
        description: tickets.description,
        priority: tickets.priority,
        status: tickets.status,
        reporterId: tickets.reporterId,
        reporterName: users.name,
        reporterEmail: users.email,
        assigneeId: tickets.assigneeId,
        assigneeName: users.name, // Will be overridden or joined properly below
        assetId: tickets.assetId,
        assetTag: assets.assetTag,
        assetName: assets.name,
        assetImagesJson: assets.imagesJson,
        createdAt: tickets.createdAt,
        resolvedAt: tickets.resolvedAt,
        satisfactionRating: tickets.satisfactionRating,
        resolutionNote: tickets.resolutionNote,
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.reporterId, users.id))
      .leftJoin(assets, eq(tickets.assetId, assets.id));

    // Handle role filtering
    // General users (USER) can only see tickets they submitted
    let results: any[] = [];
    if (userRole === 'USER') {
      results = await query.where(eq(tickets.reporterId, userId)).orderBy(desc(tickets.createdAt));
    } else {
      // ADMIN, TECH, APPROVER see everything
      results = await query.orderBy(desc(tickets.createdAt));
    }

    // Since we need to join users twice (once for reporter, once for assignee), 
    // Drizzle with edge SQLite works best if we fetch assignee names separately or do a map.
    // Let's do a map to fetch assignee details for clean output
    const allUsers = (await db.select({ id: users.id, name: users.name, email: users.email }).from(users) as any[]);
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    const formattedResults = (results as any[]).map(ticket => {
      const assignee = ticket.assigneeId ? (userMap.get(ticket.assigneeId) as any) : null;
      // Resolve the reporter name properly from the join (drizzle aliasing is handled)
      const reporter = ticket.reporterId ? userMap.get(ticket.reporterId) : null;
      
      return {
        ...ticket,
        reporterName: reporter?.name || 'Unknown',
        reporterEmail: reporter?.email || '',
        assigneeName: assignee?.name || null,
        assigneeEmail: assignee?.email || null,
      };
    });

    return NextResponse.json(formattedResults);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const reporterId = Number(request.headers.get('x-user-id'));
    const reporterName = decodeURIComponent(request.headers.get('x-user-name') || 'User');
    const { title, description, priority, assetId } = ((await request.json() as any)) as any;

    if (!title) {
      return NextResponse.json({ error: 'Missing title field' }, { status: 400 });
    }

    const db = getDb();

    // Fetch reporter user to resolve department approval
    const reporter = await db.query.users.findFirst({
      where: eq(users.id, reporterId),
    });

    let approverUserId: number | null = null;
    if (reporter?.departmentId) {
      const dept = await db.query.departments.findFirst({
        where: eq(departments.id, reporter.departmentId),
      });
      if (dept?.approverUserId) {
        approverUserId = dept.approverUserId;
      }
    }

    const isSelfApprover = reporterId === approverUserId;
    const needsApproval = approverUserId && !isSelfApprover && reporter?.role !== 'ADMIN' && reporter?.role !== 'TECH' && reporter?.role !== 'APPROVER';
    const initialStatus = needsApproval ? 'Pending_Approval' : 'Open';
    
    // Generate standard ticket number: TCK-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const ticketCountResult = await db.select({ id: tickets.id }).from(tickets);
    const nextSeq = String(ticketCountResult.length + 1).padStart(4, '0');
    const ticketNo = `TCK-${dateStr}-${nextSeq}`;

    const [newTicket] = await db.insert(tickets).values({
      ticketNo,
      title,
      description: description || null,
      priority: priority || 'Medium',
      status: initialStatus,
      reporterId,
      assetId: assetId ? Number(assetId) : null,
    }).returning();

    // Log action
    await writeAuditLog({
      userId: reporterId,
      action: 'CREATE_TICKET',
      details: `Created ticket ${ticketNo}: "${title}" (Initial status: ${initialStatus})`,
    });

    // Send notifications (Email, LINE, Telegram)
    try {
      if (needsApproval && approverUserId) {
        await sendNotification({
          title: ` Awaiting Approval: ${ticketNo}`,
          message: `ใบงานใหม่ต้องการความเห็นชอบจากคุณ\nเรื่อง: ${title}\nผู้แจ้ง: ${reporterName}\nรายละเอียด: ${description || '-'}`,
          recipientUserId: approverUserId
        });
      } else {
        await sendNotification({
          title: `🔧 งานแจ้งซ่อมใหม่: ${ticketNo}`,
          message: `เรื่อง: ${title}\nความสำคัญ: ${priority || 'Medium'}\nผู้แจ้ง: ${reporterName}\nรายละเอียด: ${description || '-'}`,
          recipientRole: 'TECH' // Notify technicians!
        });
      }
    } catch (e) {
      console.error('Notification failed:', e);
    }

    return NextResponse.json(newTicket, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
