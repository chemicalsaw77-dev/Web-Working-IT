import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

export async function POST(request: Request) {
  try {
    const userId = Number(request.headers.get('x-user-id'));
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { profilePicture } = ((await request.json() as any)) as any;
    if (!profilePicture) {
      return NextResponse.json({ error: 'Missing profilePicture data' }, { status: 400 });
    }

    const db = getDb();
    await db.update(users).set({
      profilePicture,
    }).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
