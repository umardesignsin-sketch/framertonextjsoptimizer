// Edge-safe Auth.js config (no Prisma/bcrypt imports) — used by proxy.ts to
// gate /dashboard/*. Real providers (Credentials, which needs Prisma) live in
// lib/auth.ts, imported only by Node-runtime route handlers/server actions.
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
