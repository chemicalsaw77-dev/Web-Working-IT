import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { knowledgeBase } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { eq } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

function isAuthorized(request: Request) {
  const role = request.headers.get('x-user-role');
  return role === 'ADMIN' || role === 'TECH';
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = Number(params.id);
    const { title, content, category } = ((await request.json() as any)) as any;
    const db = getDb();

    const article = await db.query.knowledgeBase.findFirst({
      where: eq(knowledgeBase.id, id),
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (category) updateData.category = category;

    await db.update(knowledgeBase).set(updateData).where(eq(knowledgeBase.id, id));

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'UPDATE_KB_ARTICLE',
      details: `Updated FAQ article ID ${id} ("${title || article.title}")`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = Number(params.id);
    const db = getDb();

    const article = await db.query.knowledgeBase.findFirst({
      where: eq(knowledgeBase.id, id),
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'DELETE_KB_ARTICLE',
      details: `Deleted FAQ article: "${article.title}" (ID: ${id})`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
