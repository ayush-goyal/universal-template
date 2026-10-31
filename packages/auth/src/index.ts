import { expo } from "@better-auth/expo";
import { stripe as stripePlugin } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { phoneNumber } from "better-auth/plugins/phone-number";

import { db } from "@acme/db";

import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { stripe, stripePlans, stripeWebhookSecret } from "./stripe";
import { sendOTP } from "./twilio";

export const auth = betterAuth({
  baseURL: process.env.SITE_URL,
  basePath: "/api/auth",
  trustedOrigins: ["expoboilerplate://"],
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-real-ip"],
    },
  },
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
    autoSignInAfterVerification: true,
    sendOnSignUp: false,
    expiresIn: 60 * 60,
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
      stripeWebhookSecret,
      createCustomerOnSignUp: false,
      getCustomerCreateParams: async (user) => ({
        metadata: {
          betterAuthUserId: user.id,
        },
      }),
      subscription: {
        enabled: true,
        plans: stripePlans,
        requireEmailVerification: true,
        getCheckoutSessionParams: async () => ({
          params: {
            automatic_tax: {
              enabled: true,
            },
          },
        }),
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
