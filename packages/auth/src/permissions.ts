import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
} as const;

export const organizationAccessControl = createAccessControl(statement);

// Product authorization is checked against the database on every request. These
// roles only permit the Better Auth invitation flow used by company admins.
export const organizationRoles = {
  owner: organizationAccessControl.newRole({}),
  member: organizationAccessControl.newRole({}),
  admin: organizationAccessControl.newRole({ invitation: ["create", "cancel"] }),
  agent: organizationAccessControl.newRole({}),
};
