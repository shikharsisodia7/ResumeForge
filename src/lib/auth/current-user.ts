import type { User } from "@prisma/client";
import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { UnauthorizedError } from "@/lib/errors";

/**
 * Resolves the Auth0 session (if any) to our internal `User` row, creating
 * or refreshing it on the fly. The Auth0 `sub` is the durable identity key;
 * our internal id is what every other table's ownership check is built on.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth0.getSession();
  const sessionUser = session?.user;
  if (!sessionUser?.sub) return null;

  const displayName = sessionUser.name || sessionUser.nickname || sessionUser.email || "ResumeForge user";

  return prisma.user.upsert({
    where: { auth0Sub: sessionUser.sub },
    update: {
      email: sessionUser.email ?? undefined,
      displayName,
    },
    create: {
      auth0Sub: sessionUser.sub,
      email: sessionUser.email ?? "",
      displayName,
    },
  });
}

/** Same as {@link getCurrentUser} but throws a 401 when there is no session. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
