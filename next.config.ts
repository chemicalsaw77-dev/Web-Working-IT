import type { NextConfig } from "next";

// Initialize local D1 database emulation in development mode only when flag is active
if (process.env.NODE_ENV === 'development' && process.execArgv.includes('--experimental-sqlite')) {
  try {
    const { DatabaseSync } = require('node:sqlite');

    class MockD1PreparedStatement {
      stmt: any;
      bindings: any[];
      constructor(stmt: any, bindings: any[] = []) {
        this.stmt = stmt;
        this.bindings = bindings;
      }

      bind(...values: any[]) {
        return new MockD1PreparedStatement(this.stmt, values);
      }

      all() {
        try {
          const rows = this.stmt.all(...this.bindings);
          return {
            results: rows,
            success: true,
            meta: { changes: 0, duration: 0 }
          };
        } catch (e) {
          console.error('Mock D1 Query Error (all):', e);
          throw e;
        }
      }

      run() {
        try {
          const info = this.stmt.run(...this.bindings);
          return {
            success: true,
            meta: { changes: info.changes, duration: 0 }
          };
        } catch (e) {
          console.error('Mock D1 Query Error (run):', e);
          throw e;
        }
      }

      first(colName?: string) {
        try {
          const rows = this.stmt.all(...this.bindings);
          if (rows.length === 0) return null;
          const row = rows[0];
          if (colName) return row[colName];
          return row;
        } catch (e) {
          console.error('Mock D1 Query Error (first):', e);
          throw e;
        }
      }
    }

    class MockD1Database {
      db: any;
      constructor(filename: string) {
        this.db = new DatabaseSync(filename);
      }

      prepare(query: string) {
        const stmt = this.db.prepare(query);
        return new MockD1PreparedStatement(stmt);
      }

      exec(query: string) {
        this.db.exec(query);
        return { count: 0, duration: 0 };
      }

      batch(statements: any[]) {
        return statements.map(stmt => stmt.all());
      }
    }

    (globalThis as any).LOCAL_DB = new MockD1Database('local.db');
    console.log('⚡️ Local D1 Database Emulation initialized in next.config.ts (node:sqlite).');
  } catch (e) {
    console.error('Failed to initialize local D1 emulation:', e);
  }
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
