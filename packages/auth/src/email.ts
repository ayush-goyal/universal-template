import { type JSX } from "react";
import { render } from "@react-email/components";
import { Resend } from "resend";

import EmailVerificationEmail from "./emails/email-verification-email";
import InvitationEmail from "./emails/invitation-email";
import PasswordResetEmail from "./emails/password-reset-email";

const resend = new Resend(process.env.RESEND_API_KEY);

function platformFromEmail() {
  const from = process.env.PLATFORM_FROM_EMAIL?.trim();
  if (!from) throw new Error("PLATFORM_FROM_EMAIL must name a verified platform sender.");
  return from;
}

export async function sendEmail<T extends (props: any) => JSX.Element>({
  to,
  subject,
  component: Component,
  props,
}: {
  to: string;
  subject: string;
  component: T;
  props: T extends (props: infer P) => JSX.Element ? P : never;
}) {
  const { data, error } = await resend.emails.send({
    from: platformFromEmail(),
    to,
    subject,
    react: Component(props),
    text: await render(Component(props), { plainText: true }),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export const sendPasswordResetEmail = async ({
  to,
  resetLink,
}: {
  to: string;
  resetLink: string;
}) => {
  return sendEmail({
    to,
    subject: "Reset your password",
    component: PasswordResetEmail,
    props: { resetLink },
  });
};

export async function sendOrganizationInvitation({
  to,
  organizationName,
  invitationId,
}: {
  to: string;
  organizationName: string;
  invitationId: string;
}) {
  const baseUrl = process.env.SITE_URL;
  if (!baseUrl) throw new Error("SITE_URL is required for invitation links.");
  const inviteLink = new URL(
    `/accept-invitation/${encodeURIComponent(invitationId)}`,
    baseUrl
  ).toString();

  return sendEmail({
    to,
    subject: `Invitation to ${organizationName}`,
    component: InvitationEmail,
    props: { organizationName, inviteLink },
  });
}

export const sendVerificationEmail = async ({
  to,
  verificationLink,
}: {
  to: string;
  verificationLink: string;
}) => {
  return sendEmail({
    to,
    subject: "Verify your email",
    component: EmailVerificationEmail,
    props: { verificationLink },
  });
};
