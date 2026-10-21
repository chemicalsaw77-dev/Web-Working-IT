import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { departments, users } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { eq, desc } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

function isAdmin(request: Request) {
  const role = request.headers.get('x-user-role');
  return role === 'ADMIN';
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    
    // Join departments with users to fetch the head/approver name
    const results = await db
      .select({
        id: departments.id,
        name: departments.name,
        approverUserId: departments.approverUserId,
        approverName: users.name,
        approverEmail: users.email,
        createdAt: departments.createdAt,
      })
      .from(departments)
      .leftJoin(users, eq(departments.approverUserId, users.id))
      .orderBy(desc(departments.createdAt));

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, approverUserId } = ((await request.json() as any)) as any;
    if (!name) {
      return NextResponse.json({ error: 'Missing department name' }, { status: 400 });
    }

    const db = getDb();
    const [newDept] = (await db.insert(departments).values({
      name,
      approverUserId: approverUserId ? Number(approverUserId) : null,
    }).returning()) as any[];

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'CREATE_DEPARTMENT',
      details: `Created department: "${name}" (ID: ${newDept.id})`,
    });

    return NextResponse.json(newDept, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
