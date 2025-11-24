import { createClient } from "@libsql/client";

export const turso = createClient({
  url: process.env.LOCAL_DATABASE_URL as string,
  syncUrl: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  syncInterval: 60000,
});

await turso.sync();
