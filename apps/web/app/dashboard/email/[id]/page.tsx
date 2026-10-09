import { redirect } from "next/navigation";

export default async function DashboardEmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/company/email/${encodeURIComponent(id)}`);
}
