import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignUp() {
  return (
    <div className="w-full max-w-md">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">Invitation required</CardTitle>
          <CardDescription>Accounts are created through a company invitation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Your company administrator will email you an invitation to join the workspace.</p>
          <p>
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
