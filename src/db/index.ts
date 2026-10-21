/// <reference types="@cloudflare/workers-types" />
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

let dbInstance: any = null;

export function getDb() {
  if (!dbInstance) {
    const client = createClient({ url: 'file:local.db' });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}
