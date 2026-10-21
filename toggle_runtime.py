import sys
import os

if len(sys.argv) < 2:
    print("Usage: python toggle_runtime.py [node|edge]")
    sys.exit(1)

mode = sys.argv[1].lower()
src_path = r"d:\Web-Working-IT\src"

# 1. Toggle "export const runtime = 'edge';" in all TS/TSX files
for root, dirs, files in os.walk(src_path):
    for file in files:
        if file.endswith((".ts", ".tsx")) and file != "index.ts": # Skip db index.ts
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            if mode == 'node':
                # Comment out edge runtime declarations
                new_content = content.replace(
                    "export const runtime = 'edge';", 
                    "// export const runtime = 'edge'; /* local-dev-node */"
                )
            else:
                # Restore edge runtime declarations
                new_content = content.replace(
                    "// export const runtime = 'edge'; /* local-dev-node */", 
                    "export const runtime = 'edge';"
                )
            
            if new_content != content:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)

# 2. Toggle src/db/index.ts schema connection code
db_index_path = os.path.join(src_path, "db", "index.ts")

edge_db_code = """/// <reference types="@cloudflare/workers-types" />
import { drizzle } from 'drizzle-orm/d1';
import { getRequestContext } from '@cloudflare/next-on-pages';
import * as schema from './schema';

export function getDb() {
  try {
    const context = getRequestContext();
    if (context?.env?.DB) {
      return drizzle(context.env.DB, { schema });
    }
  } catch (error) {
    // Fails outside request lifecycle
  }

  throw new Error('Cloudflare D1 Database binding "DB" is not available.');
}
"""

node_db_code = """/// <reference types="@cloudflare/workers-types" />
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
"""

target_code = node_db_code if mode == "node" else edge_db_code

with open(db_index_path, "w", encoding="utf-8") as f:
    f.write(target_code)

print(f"Successfully toggled system config to: {mode.upper()} mode.")
