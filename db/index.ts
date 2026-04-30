import { drizzle } from "drizzle-orm/postgres-js";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import postgres from "postgres";

let _db: any = null;

export const db = new Proxy({} as any, {
  get(_target, prop) {
    if (!_db) {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error(
          "DATABASE_URL is not set. Database features are disabled in local development without a database."
        );
      }

      const isLocal = url.includes("localhost") || url.includes("127.0.0.1") || url.includes("db");

      if (isLocal) {
        const client = postgres(url);
        _db = drizzle({ client });
      } else {
        const sql = neon(url);
        _db = drizzleNeon({ client: sql });
      }
    }
    return (_db as any)[prop];
  },
}) as any;
