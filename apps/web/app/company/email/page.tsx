import { redirect } from "next/navigation";

export default async function CompanyEmailPage() {
  redirect("/dashboard/settings#email");
}
