# Local end-to-end walkthrough

This walkthrough exercises the browser voice prototype as a staff member speaking **as the customer**. No phone call is placed and no payment is collected. Use controlled inboxes and fictional case data only. [Local runtime setup](./local-demo.md) describes the Compose services in more detail.

## Prepare the demo

1. Copy `.env.example` to the gitignored root `.env`. Configure PostgreSQL, `BETTER_AUTH_SECRET`, `HONO_SERVICE_TOKEN`, `SITE_URL=http://localhost:3000`, `OPENAI_API_KEY`, `RESEND_API_KEY`, and a verified `PLATFORM_FROM_EMAIL`. Keep all keys and passwords out of this document and commits.
2. Set **six valid, distinct inboxes you control** in `.env`: `DEMO_EMAIL_MARIA`, `DEMO_EMAIL_THEO`, `DEMO_EMAIL_KEISHA`, `DEMO_EMAIL_JORDAN`, `DEMO_EMAIL_NORTHSIDE`, and `DEMO_EMAIL_CEDAR`. The seed refuses missing, invalid, or duplicate addresses. It updates the six cases' billing recipients on a rerun without resetting their case work.
3. Set `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` for the one-off bootstrap. Leave `PLATFORM_ADMIN_EMAIL` set through the seed: when `DEMO_ADMIN_EMAIL` is absent, the seed adds the **existing** platform admin as an explicit `admin` member of Summit Climate Services. The platform marker alone does not grant company access. Bootstrap before seeding; the seed refuses to create a placeholder platform user. `DEMO_AGENT_EMAIL` is optional. A distinct `DEMO_ADMIN_EMAIL` may select another demo admin account.
4. Before applying migrations to a database with existing data, review the separate concurrent Stripe-removal migration `packages/db/prisma/migrations/20261009150213/migration.sql`; it may drop legacy tables or a column. Do not apply it blindly. The collections migration is separate. Do not reset the database.

From the repository root, after reviewing the migration:

```bash
docker compose up -d db
docker compose run --rm tools --filter @acme/db exec prisma migrate deploy
docker compose run --rm tools --filter @acme/db db:backfill-case-details
docker compose run --rm tools --filter @acme/auth platform:bootstrap
docker compose run --rm tools --filter @acme/db db:seed
docker compose up --build -d server web
```

Sign in at `http://localhost:3000/sign-in` with the bootstrapped platform account. Its seed-created Summit membership makes the six cases available at `/dashboard/cases`; `/dashboard` shows simulated overview metrics. `/platform/companies` is the separate platform administration screen. The seed includes a published policy with an example two-installment limit; open it from Settings before starting calls.

## Verify the company sender domain

The company admin opens `/dashboard/settings`, enters a domain they control in the customer email section, and copies the displayed DNS records into that domain's DNS provider. Use **Start verification** and **Refresh status** until Resend reports `verified` with sending enabled. Customer mail uses `collections@<that domain>`; the platform's `PLATFORM_FROM_EMAIL` is for staff authentication mail. The seed does not claim that a company domain is verified.

A completed arrangement, payment claim, or service dispute creates one customer email row in `pending_review`. Open it from Settings or the case detail, inspect the exact recipient and outcome facts, use **Generate checked draft** if needed, then **Approve and queue**. Approval requires a verified company sender domain and rechecks the message. `queued` means ready for the delivery worker; it is not proof that the inbox received it. Inspect the later provider and delivery status on that message page and compare the received subject, body, recipient, and From domain in the controlled inbox. Delivery worker behavior and actual inbox receipt still need verification.

## Run the six cases

Open each row from `/dashboard/cases`, select **Start call**, allow microphone access, and speak as that case's customer or authorized contact. The agent should introduce itself as an AI assistant. The signed-in staff member selects the case; this browser role-play has no separate customer identity check or demo code. The call page shows the text transcript from the start of the conversation. End each call with **End call**, then refresh the case and call pages.

| Case                              | Conversation to roleplay                                                                                                                                                                                                                                         | Expected persisted result                                                                                                                                                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Maria Ellis** · $480            | Answer as Maria, the authorized contact. State that you can pay two $240 installments on specific dates relative to the day of the demo: first within 14 calendar days, final within 45. The agent should submit the agreed terms without a second confirmation. | One `arrangement` call outcome; case `arrangement_recorded`; one active arrangement in case details; outstanding remains **$480**. One arrangement email starts `pending_review`, then may be queued after checked approval.                       |
| **Theo Ramirez** · $390           | Answer as Theo, the authorized contact. Ask about the earlier $300 payment and the amount still due. Do not agree to a new plan for this context-only run.                                                                                                       | Transcript and summary, if produced, use **$390 remaining** and do not count the earlier $300 again. Ending without a business outcome leaves the case `ready` and creates no customer email.                                                      |
| **Keisha Patel** · $1,140         | Answer as Keisha, the authorized contact. Say the repaired AC still leaks and ask for the service issue to be reviewed.                                                                                                                                          | `work_quality_dispute` outcome; case `paused_for_review`; one open `service_quality_dispute` follow-up for a service manager. Negotiation stops. One acknowledgement email starts `pending_review`.                                                |
| **Jordan Kim** · $760             | Answer as Jordan, the authorized contact. Claim a bank transfer and give a claimed date, method, and reference.                                                                                                                                                  | `payment_claim` outcome with those claim details and `receivedPaymentVerified: false`; case `paused_for_review`; one open `payment_reconciliation` follow-up. No paid or resolved status. One acknowledgement email starts `pending_review`.       |
| **Northside Dental LLC** · $2,250 | Role-play the authorized office manager. Mention the earlier receptionist contact, then ask for a human callback if the account needs review.                                                                                                                    | The receptionist history remains context. A human request creates an `escalation` outcome and callback follow-up, with no arrangement or customer email.                                                                                           |
| **Cedar Bakery LLC** · $910       | Let the agent check in on the existing two $455 installments. Say you can keep the first payment and want the second moved from November 6 to November 20.                                                                                                       | One `arrangement_amended` outcome; the replacement schedule becomes active, the old one remains in arrangement history, and no callback is created. For a simple on-track confirmation, expect `plan_check_in` with no schedule or balance change. |

The voice service stores text from the beginning of the conversation, not audio. For each run, inspect `/dashboard/cases/<case-id>` for status, active arrangement, follow-up, call list, and email list. Expand a call on that same case page to read its text transcript, summary, and outcome data. Use `/dashboard/cases` for open human follow-up flags and controls. Settings lists customer messages and their exact content and latest delivery state.

## Additional safety checks

- On a separate attempt, request a human callback or express uncertainty about the account and confirm the call escalates without an arrangement or customer email. The text transcript should include the opening exchange.
- Disconnect before agreeing to complete payment amounts and dates and confirm the call is incomplete or has no outcome, with no new arrangement or confirmation email. A completed arrangement is a payment promise, not a receipt.
- Repeat an end action or a provider event and confirm there is still one outcome, one follow-up where applicable, and at most one email event for the call. This behavior and the six browser runs still need test and manual verification; this document does not assert that they have passed.
