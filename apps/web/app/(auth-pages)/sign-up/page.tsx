import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { env } from "@/env";
import { getSafeRedirectPath } from "@/lib/redirect";

export const metadata: Metadata = {
  title: "Sign up",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}) {
  const { redirectTo } = await searchParams;

  return <SignUpForm redirectTo={getSafeRedirectPath(redirectTo, env.SITE_URL)} />;
}
