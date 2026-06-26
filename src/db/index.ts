import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_POOLER_URL ?? process.env.DATABASE_URL!;

// Server-side only — never import this in client components
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
