import { getDb } from '@/db';
import { auditLogs } from '@/db/schema';

export async function writeAuditLog({
  userId,
  action,
  details,
  ipAddress,
}: {
  userId: number | null;
  action: string;
  details: string;
  ipAddress?: string;
}) {
  try {
    const db = getDb();
    await db.insert(auditLogs).values({
      userId,
      action,
      details,
      ipAddress: ipAddress || null,
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
}
