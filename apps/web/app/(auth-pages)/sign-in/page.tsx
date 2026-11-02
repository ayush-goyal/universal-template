import type { Metadata } from "next";

import { SignInForm } from "@/components/auth/sign-in-form";
import { env } from "@/env";
import { getSafeRedirectPath } from "@/lib/redirect";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}) {
  const { redirectTo } = await searchParams;

  return <SignInForm redirectTo={getSafeRedirectPath(redirectTo, env.SITE_URL)} />;
}
