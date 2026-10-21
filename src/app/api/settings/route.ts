import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { settings } from '@/db/schema';
import { writeAuditLog } from '@/lib/audit';
import { eq } from 'drizzle-orm';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

function isAdmin(request: Request) {
  const role = request.headers.get('x-user-role');
  return role === 'ADMIN';
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    const allSettings = await db.select().from(settings);
    
    // Convert array of {key, value} to a clean key-value object
    const settingsObject: Record<string, string> = {};
    allSettings.forEach((s: { key: string; value: string | null }) => {
      settingsObject[s.key] = s.value || '';
    });

    return NextResponse.json(settingsObject);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = ((await request.json() as any)) as Record<string, string>;
    const db = getDb();

    // Iterate and upsert all settings keys
    for (const [key, value] of Object.entries(payload)) {
      // Check if key exists
      const existing = await db.query.settings.findFirst({
        where: eq(settings.key, key),
      });

      if (existing) {
        await db.update(settings).set({ value }).where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({ key, value });
      }
    }

    // Update process.env/global variables dynamically to apply tokens in current session
    if (payload.lineNotifyToken) process.env.LINE_NOTIFY_TOKEN = payload.lineNotifyToken;
    if (payload.telegramBotToken) process.env.TELEGRAM_BOT_TOKEN = payload.telegramBotToken;
    if (payload.telegramChatId) process.env.TELEGRAM_CHAT_ID = payload.telegramChatId;
    if (payload.resendApiKey) process.env.RESEND_API_KEY = payload.resendApiKey;
    if (payload.emailService) process.env.EMAIL_SERVICE = payload.emailService;
    if (payload.smtpHost) process.env.SMTP_HOST = payload.smtpHost;
    if (payload.smtpPort) process.env.SMTP_PORT = payload.smtpPort;
    if (payload.smtpUser) process.env.SMTP_USER = payload.smtpUser;
    if (payload.smtpPass) process.env.SMTP_PASS = payload.smtpPass;
    if (payload.smtpFrom) process.env.SMTP_FROM = payload.smtpFrom;
    if (payload.smtpSecure) process.env.SMTP_SECURE = payload.smtpSecure;

    const actorId = Number(request.headers.get('x-user-id'));
    await writeAuditLog({
      userId: actorId,
      action: 'UPDATE_SYSTEM_SETTINGS',
      details: `Updated system configurations: ${Object.keys(payload).join(', ')}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
