import { NextResponse } from "next/server";

export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _vercel routes
     * - favicon.* files
     * - android-chrome.* files
     * - apple-touch-icon.* files
     * - manifest.json
     * - robots.txt
     * - sitemap.xml
     * - files ending with .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!api|_next/static|_next/image|_vercel|favicon.*|android-chrome.*|apple-touch-icon.*|manifest\\.json|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
