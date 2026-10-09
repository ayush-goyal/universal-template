import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { organization, phoneNumber } from "better-auth/plugins";

import { db } from "@acme/db";

import { sendOrganizationInvitation, sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { INVITATION_HEADER, requireRegistrationInvitation } from "./invitations";
import { organizationAccessControl, organizationRoles } from "./permissions";
import { sendOTP } from "./twilio";

export const auth = betterAuth({
  baseURL: process.env.SITE_URL,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET,
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-real-ip"],
    },
  },
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      await requireRegistrationInvitation(
        ctx.headers?.get(INVITATION_HEADER) ?? null,
        ctx.body?.email
      );
    }),
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        resetLink: url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        to: user.email,
        verificationLink: url,
      });
    },
  },
  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        await sendOTP(phoneNumber, code);
      },
      otpLength: 6,
      expiresIn: 60 * 10, // 10 minutes
      requireVerification: true,
    }),
    organization({
      ac: organizationAccessControl,
      roles: organizationRoles,
      creatorRole: "admin",
      allowUserToCreateOrganization: false,
      requireEmailVerificationOnInvitation: true,
      async sendInvitationEmail({ id, email, organization: invitedOrganization }) {
        await sendOrganizationInvitation({
          to: email,
          organizationName: invitedOrganization.name,
          invitationId: id,
        });
      },
      organizationHooks: {
        async beforeCreateInvitation({ invitation, inviter, organization: invitedOrganization }) {
          const membership = await db.member.findUnique({
            where: {
              organizationId_userId: {
                organizationId: invitedOrganization.id,
                userId: inviter.id,
              },
            },
          });
          if (membership?.role !== "admin" || invitation.role !== "agent") {
            throw new APIError("FORBIDDEN", {
              message: "Company admins may invite agents only.",
            });
          }
        },
        async beforeAcceptInvitation({ invitation }) {
          if (invitation.role !== "admin" && invitation.role !== "agent") {
            throw new APIError("FORBIDDEN", { message: "Unsupported company role." });
          }
        },
        async beforeAddMember() {
          throw new APIError("FORBIDDEN", { message: "Use a staff invitation." });
        },
        async beforeUpdateMemberRole() {
          throw new APIError("FORBIDDEN", { message: "Member roles cannot be changed here." });
        },
        async beforeRemoveMember() {
          throw new APIError("FORBIDDEN", { message: "Manage agents through company settings." });
        },
      },
    }),
  ],
});
