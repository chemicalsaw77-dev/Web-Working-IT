import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { hashPassword } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { eq } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

function isAdmin(request: Request) {
  return request.headers.get('x-user-role') === 'ADMIN';
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = Number(params.id);
    const { name, email, password, role, lineUserId, telegramChatId, departmentId, profilePicture } = ((await request.json() as any)) as any;
    const db = getDb();

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (role) updateData.role = role;
    if (lineUserId !== undefined) updateData.lineUserId = lineUserId;
    if (telegramChatId !== undefined) updateData.telegramChatId = telegramChatId;
    if (departmentId !== undefined) {
      updateData.departmentId = departmentId ? Number(departmentId) : null;
    }
    if (profilePicture !== undefined) {
      updateData.profilePicture = profilePicture || null;
    }

    if (password) {
      updateData.password = await hashPassword(password);
    }

    await db.update(users).set(updateData).where(eq(users.id, id));

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'UPDATE_USER',
      details: `Updated user ID ${id} (${email || user.email})`,
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

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't allow deleting self
    const actorId = Number(request.headers.get('x-user-id'));
    if (actorId === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await db.delete(users).where(eq(users.id, id));

    await writeAuditLog({
      userId: actorId,
      action: 'DELETE_USER',
      details: `Deleted user ${user.name} (${user.email})`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
