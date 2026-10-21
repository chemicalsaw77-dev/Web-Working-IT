import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { roles } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { eq } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

function isAdmin(request: Request) {
  const role = request.headers.get('x-user-role');
  return role === 'ADMIN';
}

export async function DELETE(request: Request, props: { params: Promise<{ name: string }> }) {
  // Wait, Next.js params can be structured differently. Let's make sure it handles params promise.
  const routeParams = await props.params;
  const name = decodeURIComponent(routeParams.name).toUpperCase().trim();

  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Default roles cannot be deleted for system safety
    if (['ADMIN', 'TECH', 'USER', 'APPROVER'].includes(name)) {
      return NextResponse.json({ error: 'Cannot delete system default roles' }, { status: 400 });
    }

    const db = getDb();
    const existing = await db.query.roles.findFirst({
      where: eq(roles.name, name),
    });

    if (!existing) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    await db.delete(roles).where(eq(roles.name, name));

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'DELETE_ROLE',
      details: `Deleted custom role: "${name}"`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
