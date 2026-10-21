import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { knowledgeBase, users } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { desc, eq } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

function isAuthorized(request: Request) {
  const role = request.headers.get('x-user-role');
  return role === 'ADMIN' || role === 'TECH';
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    const articles = await db
      .select({
        id: knowledgeBase.id,
        title: knowledgeBase.title,
        content: knowledgeBase.content,
        category: knowledgeBase.category,
        authorId: knowledgeBase.authorId,
        authorName: users.name,
        createdAt: knowledgeBase.createdAt,
        updatedAt: knowledgeBase.updatedAt,
      })
      .from(knowledgeBase)
      .innerJoin(users, eq(knowledgeBase.authorId, users.id))
      .orderBy(desc(knowledgeBase.createdAt));

    return NextResponse.json(articles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, content, category } = ((await request.json() as any)) as any;
    const authorId = Number(request.headers.get('x-user-id'));

    if (!title || !content || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();
    const [newArticle] = await db.insert(knowledgeBase).values({
      title,
      content,
      category,
      authorId,
    }).returning();

    await writeAuditLog({
      userId: authorId,
      action: 'CREATE_KB_ARTICLE',
      details: `Created FAQ article: "${title}" in category ${category}`,
    });

    return NextResponse.json(newArticle, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
