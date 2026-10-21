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

const DEFAULT_ROLES = [
  {
    name: 'ADMIN',
    menusJson: JSON.stringify([
      '/dashboard',
      '/dashboard/tickets',
      '/dashboard/assets',
      '/dashboard/pm',
      '/dashboard/inventory',
      '/dashboard/kb',
      '/dashboard/users',
      '/dashboard/departments',
      '/dashboard/roles',
      '/dashboard/settings',
      '/dashboard/audit'
    ])
  },
  {
    name: 'TECH',
    menusJson: JSON.stringify([
      '/dashboard',
      '/dashboard/tickets',
      '/dashboard/assets',
      '/dashboard/pm',
      '/dashboard/inventory',
      '/dashboard/kb',
      '/dashboard/audit'
    ])
  },
  {
    name: 'APPROVER',
    menusJson: JSON.stringify([
      '/dashboard',
      '/dashboard/tickets',
      '/dashboard/assets',
      '/dashboard/pm',
      '/dashboard/kb',
      '/dashboard/audit'
    ])
  },
  {
    name: 'USER',
    menusJson: JSON.stringify([
      '/dashboard',
      '/dashboard/tickets',
      '/dashboard/kb'
    ])
  }
];

export async function GET(request: Request) {
  try {
    const db = getDb();
    let allRoles = await db.select().from(roles);

    // Auto-seed if database is empty
    if (allRoles.length === 0) {
      for (const r of DEFAULT_ROLES) {
        await db.insert(roles).values(r);
      }
      allRoles = await db.select().from(roles);
    }

    return NextResponse.json(allRoles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, menus } = ((await request.json() as any)) as any;
    if (!name || !Array.isArray(menus)) {
      return NextResponse.json({ error: 'Missing name or menus array' }, { status: 400 });
    }

    const uppercaseName = name.toUpperCase().trim();
    const menusJson = JSON.stringify(menus);
    const db = getDb();

    // Check if role exists
    const existing = await db.query.roles.findFirst({
      where: eq(roles.name, uppercaseName),
    });

    if (existing) {
      await db.update(roles).set({ menusJson }).where(eq(roles.name, uppercaseName));
    } else {
      await db.insert(roles).values({ name: uppercaseName, menusJson });
    }

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'UPDATE_ROLE_PERMISSIONS',
      details: `Updated permissions for role "${uppercaseName}" to access: ${menus.join(', ')}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
