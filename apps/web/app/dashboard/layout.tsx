import { redirect } from "next/navigation";

/**
 * Legacy dashboard route — all traffic now goes to /app/inbox.
 */
export default function DashboardLayout() {
  redirect("/app/inbox");
}
