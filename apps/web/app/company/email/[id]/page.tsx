import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { db } from "@acme/db";

import { AuthorizationError, requireCompanyAccess } from "@/lib/authorization";

export default async function EmailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;
  let id: string;
  try {
    id = decodeURIComponent(routeId);
  } catch {
    notFound();
  }
  const message = await db.emailMessage.findUnique({
    where: { id },
    select: { organizationId: true, caseId: true, id: true },
  });
  if (!message) notFound();
  try {
    await requireCompanyAccess(await headers(), message.organizationId);
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) redirect("/sign-in");
    notFound();
  }

  redirect(
    `/dashboard/cases/${encodeURIComponent(message.caseId)}?email=${encodeURIComponent(message.id)}#emails`
  );
}
