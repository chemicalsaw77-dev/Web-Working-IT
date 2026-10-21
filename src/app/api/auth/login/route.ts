import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { count, eq } from 'drizzle-orm';
import { verifyPassword, hashPassword, createSessionToken } from '@/lib/auth';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

export async function POST(request: Request) {
  try {
    const { email, password } = ((await request.json() as any)) as any;
    if (!email || !password) {
      return NextResponse.json({ error: 'Please provide email and password' }, { status: 400 });
    }

    const db = getDb();

    // 1. Auto-seeding check: If there are no users, create a default admin
    const userCountResult = await db.select({ val: count() }).from(users);
    const userCount = userCountResult[0]?.val || 0;

    if (userCount === 0) {
      const defaultEmail = 'admin@itwork.com';
      const defaultPassword = 'Password123!';
      const hashedPassword = await hashPassword(defaultPassword);
      
      await db.insert(users).values({
        name: 'Administrator',
        email: defaultEmail,
        password: hashedPassword,
        role: 'ADMIN',
      });
      
      // If logging in with the newly created default admin
      if (email.toLowerCase() === defaultEmail && password === defaultPassword) {
        const adminUser = await db.query.users.findFirst({
          where: eq(users.email, defaultEmail),
        });
        
        if (adminUser) {
          const token = await createSessionToken({
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role,
          });

          const response = NextResponse.json({ success: true, user: { name: adminUser.name, role: adminUser.role } });
          response.cookies.set('session-token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
          });
          return response;
        }
      }
    }

    // 2. Standard Login Flow
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set('session-token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
