import { type JSX } from "react";
import { render } from "@react-email/components";
import { Resend } from "resend";

import EmailVerificationEmail from "./emails/email-verification-email";
import PasswordResetEmail from "./emails/password-reset-email";
import ReminderEmail from "./emails/reminder-email";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Company Name <support@transactional.example.com>";

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
    from: FROM_EMAIL,
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

export const sendReminderEmail = async ({
  to,
  taskTitle,
  taskUrl,
  dueLabel,
}: {
  to: string;
  taskTitle: string;
  taskUrl: string;
  dueLabel?: string;
}) => {
  return sendEmail({
    to,
    subject: `Reminder: ${taskTitle}`,
    component: ReminderEmail,
    props: { taskTitle, taskUrl, dueLabel },
  });
};
