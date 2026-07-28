import "server-only";

import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "./auth";

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export function getConfiguredAdminEmail() {
  return normalizeEmail(process.env.DESKCAT_ADMIN_EMAIL);
}

export function isAdminEmail(email: string | null | undefined) {
  const configuredAdminEmail = getConfiguredAdminEmail();
  return configuredAdminEmail.length > 0 && normalizeEmail(email) === configuredAdminEmail;
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/admin");
  }

  if (!isAdminEmail(session.user.email)) {
    notFound();
  }

  return session;
}

export async function getAdminSession() {
  const session = await getServerSession(authOptions);

  if (!isAdminEmail(session?.user?.email)) {
    return null;
  }

  return session;
}
