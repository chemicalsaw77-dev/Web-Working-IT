import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { hashPassword } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { eq, desc } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

// Helper to check if requester is Admin
function isAdmin(request: Request) {
  const role = request.headers.get('x-user-role');
  return role === 'ADMIN';
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    const allUsers = await db.query.users.findMany({
      orderBy: desc(users.createdAt),
      columns: {
        password: false, // Don't return hashed passwords
      }
    });
    return NextResponse.json(allUsers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, email, password, role, departmentId, lineUserId, telegramChatId, profilePicture } = ((await request.json() as any)) as any;
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();
    
    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    
    const [newUser] = await db.insert(users).values({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      departmentId: departmentId ? Number(departmentId) : null,
      lineUserId: lineUserId || null,
      telegramChatId: telegramChatId || null,
      profilePicture: profilePicture || null,
    }).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      departmentId: users.departmentId,
    });

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'CREATE_USER',
      details: `Created user ${name} (${email}) with role ${role}`,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
