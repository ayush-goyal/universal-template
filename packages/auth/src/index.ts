import { expo } from "@better-auth/expo";
import { stripe as stripePlugin } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { phoneNumber } from "better-auth/plugins";

import { getStripeEnv, getStripePlans, isStripeConfigured, stripe } from "@acme/billing";
import { db } from "@acme/db";

import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { sendOTP } from "./twilio";

/**
 * Custom scheme the Expo app is registered under, mirroring `expo.scheme` in
 * `apps/native/app.json`. Better Auth rejects redirects to origins it does not trust, and the
 * mobile app needs this in production too — not only in development.
 */
const EXPO_SCHEME = process.env.EXPO_APP_SCHEME ?? "expoboilerplate";

export const auth = betterAuth({
  baseURL: process.env.SITE_URL,
  basePath: "/api/auth",
  trustedOrigins: [`${EXPO_SCHEME}://`],
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
      stripeWebhookSecret: getStripeEnv().webhookSecret ?? "",
      // Creating the customer up front means checkout, the billing portal and any future invoice
      // lookup all have a customer to attach to, instead of racing to create one mid-flow. Off when
      // Stripe is not configured: the hook would otherwise put two doomed API calls in front of
      // every sign-up, and only log that they failed.
      createCustomerOnSignUp: isStripeConfigured(),
      getCustomerCreateParams: (user) =>
        Promise.resolve({
          metadata: { userId: user.id },
        }),
      subscription: {
        enabled: true,
        // A function rather than an array: the plugin calls it per request, so adding a plan to the
        // catalog and its price to the environment is all it takes to sell one.
        plans: () => Promise.resolve(getStripePlans()),
        // Phone-only sign-ups get a synthetic `@phone.temp` address that can never be verified, so
        // requiring verification here would lock them out of paying. Turn it on only alongside
        // `emailVerification.sendOnSignUp`.
        requireEmailVerification: false,
        /**
         * Subscriptions in this template belong to a user and nothing else. Without this check the
         * plugin accepts any `referenceId` a client sends, which would let a signed-in user read or
         * cancel somebody else's subscription. Widen it when adding organisations.
         */
        authorizeReference: ({ user, referenceId }) => Promise.resolve(referenceId === user.id),
        getCheckoutSessionParams: () => ({
          params: {
            allow_promotion_codes: true,
            billing_address_collection: "auto",
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

export type { Session } from "better-auth";
