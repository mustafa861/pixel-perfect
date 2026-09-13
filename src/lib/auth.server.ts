import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { getDb } from "./db.server";
import * as schema from "./schema";

function createAuthInstance() {
  const secret = process.env["BETTER_AUTH_SECRET"];
  if (!secret) {
    throw new Error("Missing BETTER_AUTH_SECRET environment variable.");
  }

  return betterAuth({
    secret,
    baseURL: process.env["BETTER_AUTH_URL"],
    trustedOrigins: process.env["BETTER_AUTH_URL"] ? [process.env["BETTER_AUTH_URL"]] : undefined,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    user: {
      additionalFields: {
        role: {
          type: "string",
          input: true,
          defaultValue: "student",
        },
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    session: {
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            // Mirrors the old Postgres trigger: every new account gets a profile row.
            const db = getDb();
            await db
              .insert(schema.profiles)
              .values({ id: createdUser.id, displayName: createdUser.name || "Learner" })
              .onConflictDoNothing();
          },
        },
      },
    },
  });
}

let _auth: ReturnType<typeof createAuthInstance> | undefined;

/** Server-only Better-Auth instance. Import only from server code. */
export function getAuth() {
  if (!_auth) _auth = createAuthInstance();
  return _auth;
}
