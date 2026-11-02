"use client";

import { redirect, usePathname } from "next/navigation";

import { withRedirectTo } from "@/lib/redirect";

export function ProtectedRouteRedirectHandler() {
  const pathname = usePathname();

  return redirect(withRedirectTo("/sign-in", pathname));
}
