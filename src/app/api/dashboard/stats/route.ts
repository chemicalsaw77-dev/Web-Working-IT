import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { tickets, assets, spareParts, pmLogs } from '@/db/schema';
import { count, eq, avg, sql } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

export async function GET(request: Request) {
  try {
    const db = getDb();

    // 1. Tickets Stats
    const ticketsData = (await db.select().from(tickets) as any[]);
    const totalTickets = ticketsData.length;
    const openTickets = ticketsData.filter(t => t.status === 'Open').length;
    const inProgressTickets = ticketsData.filter(t => t.status === 'In_Progress').length;
    const pendingTickets = ticketsData.filter(t => t.status === 'Pending').length;
    const resolvedTickets = ticketsData.filter(t => t.status === 'Resolved').length;
    const closedTickets = ticketsData.filter(t => t.status === 'Closed').length;

    // 2. Assets Stats
    const assetsData = (await db.select().from(assets) as any[]);
    const totalAssets = assetsData.length;
    const activeAssets = assetsData.filter(a => a.status === 'Active').length;
    const repairAssets = assetsData.filter(a => a.status === 'In_Repair').length;
    const retiredAssets = assetsData.filter(a => a.status === 'Retired').length;

    // 3. Spare Parts Stats
    const partsData = (await db.select().from(spareParts) as any[]);
    const totalParts = partsData.length;
    const lowStockParts = partsData.filter(p => p.quantity <= p.minQuantity).length;

    // 4. PM Completion Rate
    const pmLogsData = (await db.select().from(pmLogs) as any[]);
    const totalPM = pmLogsData.length;
    const completedPM = pmLogsData.filter(p => p.status === 'Completed').length;
    const pmCompletionRate = totalPM > 0 ? Math.round((completedPM / totalPM) * 100) : 100;

    // 5. CSAT Average
    const csatTickets = ticketsData.filter(t => t.satisfactionRating !== null);
    const avgCsat = csatTickets.length > 0 
      ? Number((csatTickets.reduce((acc, t) => acc + (t.satisfactionRating || 0), 0) / csatTickets.length).toFixed(1))
      : 5.0;

    // 6. MTTR (Mean Time to Resolution)
    // Diff in hours between resolvedAt/createdAt for resolved/closed tickets
    const resolvedClosed = ticketsData.filter(t => t.resolvedAt !== null);
    let totalResolutionHours = 0;
    let slaMetCount = 0; // SLA = resolved within 24 hours
    
    resolvedClosed.forEach(t => {
      const created = new Date(t.createdAt).getTime();
      const resolved = new Date(t.resolvedAt!).getTime();
      const diffHrs = (resolved - created) / (1000 * 60 * 60);
      totalResolutionHours += diffHrs;

      if (diffHrs <= 24) {
        slaMetCount++;
      }
    });

    const mttrHours = resolvedClosed.length > 0 
      ? Number((totalResolutionHours / resolvedClosed.length).toFixed(1))
      : 0.0;

    const slaComplianceRate = resolvedClosed.length > 0
      ? Math.round((slaMetCount / resolvedClosed.length) * 100)
      : 100;

    // 7. Last 6 Months Ticket Trends (Mock / Simple Grouping for UI graphs)
    // Let's return simple count for priority and status
    const priorityStats = {
      Low: ticketsData.filter(t => t.priority === 'Low').length,
      Medium: ticketsData.filter(t => t.priority === 'Medium').length,
      High: ticketsData.filter(t => t.priority === 'High').length,
      Critical: ticketsData.filter(t => t.priority === 'Critical').length,
    };

    return NextResponse.json({
      tickets: {
        total: totalTickets,
        open: openTickets,
        inProgress: inProgressTickets,
        pending: pendingTickets,
        resolved: resolvedTickets,
        closed: closedTickets,
        priorityStats,
      },
      assets: {
        total: totalAssets,
        active: activeAssets,
        inRepair: repairAssets,
        retired: retiredAssets,
      },
      inventory: {
        total: totalParts,
        lowStock: lowStockParts,
      },
      kpis: {
        csat: avgCsat,
        mttr: mttrHours,
        sla: slaComplianceRate,
        pmCompletion: pmCompletionRate,
      }
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
