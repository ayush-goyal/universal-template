import { redirect } from "next/navigation";

export default function DashboardEmailPage() {
  redirect("/dashboard/settings#email");
}
