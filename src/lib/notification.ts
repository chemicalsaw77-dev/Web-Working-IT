import { getDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Send notifications via LINE Notify
async function sendLineNotification(message: string, specificToken?: string) {
  const token = specificToken || process.env.LINE_NOTIFY_TOKEN;
  if (!token) return;

  try {
    const res = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${token}`,
      },
      body: new URLSearchParams({ message }),
    });
    if (!res.ok) {
      console.error('LINE Notify error response:', await res.text());
    }
  } catch (error) {
    console.error('Failed to send LINE notification:', error);
  }
}

// Send notifications via Telegram Bot API
async function sendTelegramNotification(message: string, chatId?: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const defaultChatId = chatId || process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !defaultChatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: defaultChatId,
        text: message,
      }),
    });
    if (!res.ok) {
      console.error('Telegram error response:', await res.text());
    }
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}

// Send notifications via Email (supports both SMTP and Resend dynamic routing)
async function sendEmailNotification(to: string, subject: string, htmlContent: string) {
  const db = getDb();
  let emailService = process.env.EMAIL_SERVICE || 'resend';
  let smtpHost = process.env.SMTP_HOST || '';
  let smtpPort = process.env.SMTP_PORT || '587';
  let smtpUser = process.env.SMTP_USER || '';
  let smtpPass = process.env.SMTP_PASS || '';
  let smtpFrom = process.env.SMTP_FROM || '';
  let smtpSecure = process.env.SMTP_SECURE || 'false';
  let resendApiKey = process.env.RESEND_API_KEY || '';

  // Query configurations from sqlite settings table
  try {
    const allSettings = await db.query.settings.findMany();
    const settingsMap = new Map<string, string | null>(allSettings.map((s: { key: string; value: string | null }) => [s.key, s.value] as [string, string | null]));
    
    if (settingsMap.has('emailService')) emailService = settingsMap.get('emailService') || emailService;
    if (settingsMap.has('smtpHost')) smtpHost = settingsMap.get('smtpHost') || smtpHost;
    if (settingsMap.has('smtpPort')) smtpPort = settingsMap.get('smtpPort') || smtpPort;
    if (settingsMap.has('smtpUser')) smtpUser = settingsMap.get('smtpUser') || smtpUser;
    if (settingsMap.has('smtpPass')) smtpPass = settingsMap.get('smtpPass') || smtpPass;
    if (settingsMap.has('smtpFrom')) smtpFrom = settingsMap.get('smtpFrom') || smtpFrom;
    if (settingsMap.has('smtpSecure')) smtpSecure = settingsMap.get('smtpSecure') || smtpSecure;
    if (settingsMap.has('resendApiKey')) resendApiKey = settingsMap.get('resendApiKey') || resendApiKey;
  } catch (e) {
    console.error('Failed to load email configurations from DB:', e);
  }

  if (emailService === 'smtp') {
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('SMTP parameters are not fully configured.');
      return;
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      console.warn('SMTP direct TCP transport is only supported in Node.js runtime. Falling back to Resend.');
    } else {
      // Node.js environment (Localhost): send via nodemailer SMTP
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(smtpPort),
          secure: smtpSecure === 'true' || smtpPort === '465',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: smtpFrom || `"IT Helpdesk" <${smtpUser}>`,
          to,
          subject,
          html: htmlContent,
        });
        return;
      } catch (error) {
        console.error('SMTP sending failed:', error);
        return;
      }
    }
  }

  // Fallback to Resend API
  if (!resendApiKey) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: smtpFrom || 'IT Helpdesk <onboarding@resend.dev>',
        to,
        subject,
        html: htmlContent,
      }),
    });
    if (!res.ok) {
      console.error('Resend email error response:', await res.text());
    }
  } catch (error) {
    console.error('Failed to send Email notification via Resend:', error);
  }
}

interface NotificationPayload {
  title: string;
  message: string;
  recipientUserId?: number;
  recipientRole?: 'ADMIN' | 'TECH' | 'USER' | 'APPROVER';
}

export async function sendNotification({
  title,
  message,
  recipientUserId,
  recipientRole,
}: NotificationPayload) {
  try {
    const db = getDb();
    const targets: { email: string; lineUserId: string | null; telegramChatId: string | null }[] = [];

    // 1. Resolve recipients
    if (recipientUserId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, recipientUserId),
      });
      if (user) {
        targets.push({
          email: user.email,
          lineUserId: user.lineUserId,
          telegramChatId: user.telegramChatId,
        });
      }
    } else if (recipientRole) {
      const roleUsers = (await db.query.users.findMany({
        where: eq(users.role, recipientRole),
      }) as any[]);
      roleUsers.forEach((u: any) => {
        targets.push({
          email: u.email,
          lineUserId: u.lineUserId,
          telegramChatId: u.telegramChatId,
        });
      });
    }

    const fullMessage = `${title}\n\n${message}`;

    // 2. Dispatch notifications
    // A. Broadcast to default group chats (LINE Notify / Telegram Group) if no specific recipient
    if (targets.length === 0) {
      await Promise.all([
        sendLineNotification(fullMessage),
        sendTelegramNotification(fullMessage),
      ]);
      return;
    }

    // B. Direct notifications to resolved targets
    for (const target of targets) {
      const emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #6366f1;">${title}</h2>
          <p style="white-space: pre-wrap; font-size: 14px; line-height: 1.5;">${message}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #999;">ระบบแจ้งเตือนอัตโนมัติ IT Helpdesk & Asset Management</p>
        </div>
      `;

      // Trigger all configured channels in parallel
      await Promise.all([
        sendEmailNotification(target.email, title, emailHtml),
        // Send to specific Telegram Chat ID if user registered one
        target.telegramChatId ? sendTelegramNotification(fullMessage, target.telegramChatId) : Promise.resolve(),
        // Send to specific LINE Notify if token is registered (users can save custom tokens as their lineUserId!)
        target.lineUserId ? sendLineNotification(fullMessage, target.lineUserId) : Promise.resolve(),
      ]);
    }
  } catch (error) {
    console.error('Failed to run sendNotification wrapper:', error);
  }
}
