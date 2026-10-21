const fs = require('fs');
const path = require('path');

const mode = (process.argv[2] || '').toLowerCase();
if (mode !== 'node' && mode !== 'edge') {
  console.log('Usage: node toggle_runtime.js [node|edge]');
  process.exit(1);
}

const srcPath = path.join(__dirname, 'src');

// 1. Toggle "export const runtime = 'edge';" in all TS/TSX files
function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (file === 'index.ts' && dir.endsWith(path.join('src', 'db'))) {
        // Skip db index.ts (handled below)
        continue;
      }
      
      const content = fs.readFileSync(fullPath, 'utf8');
      let newContent;
      if (mode === 'node') {
        newContent = content.replace(
          /export const runtime = ['"]edge['"];/g,
          "// export const runtime = 'edge'; /* local-dev-node */"
        );
      } else {
        newContent = content.replace(
          /\/\/ export const runtime = ['"]edge['"]; \/\* local-dev-node \*\//g,
          "export const runtime = 'edge';"
        );
      }
      
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
      }
    }
  }
}

walk(srcPath);

// 2. Toggle src/db/index.ts schema connection code
const dbIndexPath = path.join(srcPath, 'db', 'index.ts');

const edgeDbCode = `/// <reference types="@cloudflare/workers-types" />
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
`;

const nodeDbCode = `/// <reference types="@cloudflare/workers-types" />
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
`;

const targetCode = mode === 'node' ? nodeDbCode : edgeDbCode;
fs.writeFileSync(dbIndexPath, targetCode, 'utf8');

console.log(`Successfully toggled system config to: ${mode.toUpperCase()} mode.`);
