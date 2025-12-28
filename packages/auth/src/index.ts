import { expo } from "@better-auth/expo";
import { stripe as stripePlugin } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { phoneNumber } from "better-auth/plugins";

import { db } from "@acme/db";

import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { stripe, stripePlans } from "./stripe";
import { sendOTP } from "./twilio";

export const auth = betterAuth({
  baseURL: process.env.SITE_URL,
  basePath: "/api/auth",
  // Allow expo for development (https://github.com/better-auth/better-auth/issues/2203)
  trustedOrigins: process.env.NODE_ENV === "development" ? ["expoboilerplate://"] : undefined,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        resetLink: url,
      });
    },
  },
  emailVerification: {
    enabled: true,
    autoSignIn: true,
    sendOnSignUp: false,
    expiresAt: 60 * 60, // 1 hour
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        to: user.email,
        verificationLink: url,
      });
    },
  },
  plugins: [
    expo(),
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        await sendOTP(phoneNumber, code);
      },
      otpLength: 6,
      expiresIn: 60 * 10, // 10 minutes
      requireVerification: false, // Allow sign-in without verification initially
      signUpOnVerification: {
        getTempEmail: (phoneNumber: string) => {
          // Generate a temporary email for phone-only signups
          const cleanPhone = phoneNumber.replace(/\D/g, "");
          return `${cleanPhone}@phone.temp`;
        },
      },
    }),
    stripePlugin({
      stripeClient: stripe,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
      createCustomerOnSignUp: false,
      subscription: {
        enabled: true,
        plans: stripePlans,
        requireEmailVerification: true,
      },
    }),
  ],
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined,
});

export type { Session } from "better-auth";
