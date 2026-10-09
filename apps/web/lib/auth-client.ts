import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { organizationAccessControl, organizationRoles } from "@acme/auth/permissions";

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      ac: organizationAccessControl,
      roles: organizationRoles,
    }),
  ],
});
