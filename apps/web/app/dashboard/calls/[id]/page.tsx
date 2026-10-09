import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { db } from "@acme/db";

import { AuthorizationError, requireCompanyAccess } from "@/lib/authorization";

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = await db.callSession.findUnique({
    where: { id },
    select: { caseId: true, organizationId: true },
  });
  if (!call) notFound();

  try {
    await requireCompanyAccess(await headers(), call.organizationId);
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) redirect("/sign-in");
    notFound();
  }

  redirect(`/dashboard/cases/${call.caseId}?call=${encodeURIComponent(id)}#calls`);
}
