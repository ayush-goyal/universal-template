# Multi-Company HVAC Collections Platform

## 1. Goal and first-release boundary

Build an end-to-end platform where HVAC companies sign in, manage overdue collections cases, publish their own collections policy, conduct simulated voice calls, review outcomes and handoffs, and send follow-up email.

For this release, an admin selects a case and speaks **as the customer** in the browser. The OpenAI agent speaks as the HVAC company. Calls use live voice but no phone network. Case amounts are mock collections context; the app does not become an accounting system or process payments. Seed one company and a small set of realistic cases, while making authentication and data isolation work for multiple companies.

## 2. Stack and code organization

- **Workspace:** pnpm workspaces and Turborepo; Docker Compose runs web, voice service, and PostgreSQL locally.
- **UI:** shadcn/ui and Tailwind; TanStack Table for cases and calls; TanStack Query for changing call and email state; React Hook Form and Zod for admin forms. Use server-rendered Next.js pages for initial reads and client components for the live call screen.
- **Auth:** Better Auth with email/password, email verification, password reset, and its [organization plugin](https://better-auth.com/docs/plugins/organization). A bootstrap command creates the platform admin. Only the platform admin creates company workspaces and invites their first admin; company admins invite agents. Company roles are **admin** and **agent**.
- **Voice:** `gpt-live-1` handles browser speech over WebRTC. `gpt-6.1-sol` handles delegated case reasoning, policy decisions, summaries, and email drafting. The Hono service attaches to the OpenAI session through a [server-side connection](https://developers.openai.com/api/docs/guides/voice-server-controls), owns tool calls, and persists events. All AI models are OpenAI models.
- **Jobs and email:** pg-boss uses PostgreSQL for delivery and retries. Resend sends customer emails from each company’s [verified sender domain](https://resend.com/docs/api-reference/domains/create-domain). The platform’s own verified domain sends staff invitations and password reset messages.

Keep `organizationId` on every company-owned record. Resolve membership and role on the server for every read and mutation; a client-provided organization ID never grants access.

## 3. Product and data model

The company interface has a **Dashboard** with clearly labeled simulated metrics and graphs, a **Cases** worklist with status and follow-up flags and actions, and **Settings** for the company profile, policy, email sender setup, and message history. Case detail is the single workspace for that case: simulated call controls, expandable call records with full text transcripts and outcomes, follow-ups, and customer email status. Follow-ups are handled on Cases and case detail rather than on a separate page. The platform admin gets a separate company creation and access screen.

Keep the database small. Use these records:

- Better Auth `Organization`, `Member`, and `Invitation`, plus `CompanySettings` for the company profile, current Markdown policy, compact policy history JSON, and sender configuration JSON.
- `CollectionCase`: customer, invoice, outstanding amount, status, and a `caseData` JSON object for contact/service facts and any active arrangement. Staff notes and one current `followUp` JSON object live on the same row.
- `CallSession`: actor, connection state, policy version and text snapshot, text transcript, summarized API results JSON, one outcome kind/data JSON, and a small `sessionData` JSON object for runtime state. Store no audio.
- `EmailMessage`: exact customer message and latest delivery state; one row doubles as the durable send queue.

There are only four application tables. There is no separate policy, handoff, payment, sender-domain, contact-event, resolution, installment, transcript-turn, provider-event, delivery-attempt, or audit ledger table. The case and call rows hold the high-level result; the email row holds the exact rendered message and latest delivery state. Keep only the fields needed for the browser demo, tenant isolation, and duplicate prevention.

Case statuses are `ready`, `in_call`, `paused_for_review`, `arrangement_recorded`, `escalated`, and `resolved`. An arrangement records what the customer agreed to; it does not change the outstanding amount or claim money was received.

### Voice and resolution flow

1. The signed-in staff member selects an authorized case and speaks as its customer in the browser. The agent introduces the HVAC company and identifies itself as an AI assistant. There is no separate simulated-customer identity check or demo code; staff access to the case is enforced before the call starts.
2. **Already paid:** Capture the claimed payment date, method, and reference. Pause negotiation, record `payment_claim`, and create a reconciliation handoff. The agent cannot mark a case paid from the customer’s claim alone.
3. **Work-quality dispute:** Capture the problem and relevant service details. Pause collection, record the dispute, and create a service-manager handoff. The agent does not keep negotiating that amount.
4. **Payment arrangement:** Discuss a schedule allowed by the company’s published prose policy. The reasoning model performs the chosen **self-check** and returns the proposed schedule, supporting passage from the policy, and a clear explanation. The service verifies that the passage exists, the amounts and dates are valid, the case is eligible, and the customer explicitly confirmed the read-back. It stores the schedule once in the call outcome and case's active-arrangement JSON.
5. **Escalation:** A request for a human, ambiguous policy, unsupported terms, uncertainty about the account, repeated confusion, dispute, or paid claim stops negotiation and creates a task with the reason and transcript context. In this browser prototype, “handoff” is an assignable callback task, not a live phone transfer.

The policy is published as prose without converting it into editable rule fields. The seeded policy should contain explicit example limits so the payment-plan path can be demonstrated. If the agent cannot point to clear policy support, the proposal is escalated. This self-check is a prototype limitation to revisit before using automatic commitments with real customers.

### Email flow

After a completed outcome, `gpt-6.1-sol` drafts the appropriate customer message: arrangement confirmation, dispute acknowledgement, or payment-claim acknowledgement. The model writes the subject and prose; the service inserts authoritative names, amounts, and dates into controlled placeholders and renders the email. Checks reject unsupported claims, unknown links, wrong recipients, missing sender-domain verification, or a message inconsistent with the recorded outcome. Passing messages send automatically. Failed checks create a staff review task.

Store the exact sent content, case and call IDs, recipient, Resend ID, attempts, and status. Use both a unique database event key and [Resend idempotency key](https://resend.com/changelog/idempotency-keys/) so retries do not send duplicate messages. For the demo, seed controlled working customer addresses and verify delivery in those inboxes.

## 4. Interfaces and implementation sequence

The browser creates a WebRTC offer and calls authenticated `POST /api/calls` with `caseId` and `sdpOffer`. Next.js checks membership and case access, atomically reserves a pending `CallSession` with a policy snapshot, then calls the internal Hono service. Hono validates the reservation, creates the GPT-Live session, attaches its sideband, and returns `callId` and `sdpAnswer`. The browser applies the answer and shows voice controls and persisted text captions. Hono remains the source of truth for transcript, tool actions, and outcome. `GET /api/calls/:id` supplies persisted state; `POST /api/calls/:id/end` closes the session. On case detail, render the case first, then load history and prefetch full call records in the background; display transcript text as speaker turns with relative times. Next.js route handlers also cover case, policy, follow-up, company-domain, and email-status operations.

Build in this order:

1. **Foundation:** monorepo, Docker setup, Prisma migrations, Better Auth, platform/company roles, tenant checks, and one-company seed.
2. **Collections UI:** dashboard demo metrics and graphs, a dedicated Cases worklist with follow-up controls, manual case entry and editing, case timeline, Settings for company/email/policy, and Markdown policy publish/history.
3. **Voice:** browser WebRTC workbench, Hono session lifecycle, sideband event handling, transcripts, case tools, interruption and disconnect handling.
4. **Outcomes:** the three required branches, arrangement confirmation, escalation tasks, idempotent writes, and call summaries.
5. **Email:** per-company Resend domain setup, AI drafts, factual checks, pg-boss delivery, retries, and message history.

A dropped session before explicit confirmation remains `incomplete`; it creates neither an arrangement nor a confirmation email. Duplicate OpenAI events or repeated button presses must not duplicate a plan, handoff, or email.

## 5. Seed cases, tests, and acceptance

| Case                             | Outstanding / invoice date | Prior contact and service job                      | Edge case exercised                         |
| -------------------------------- | -------------------------- | -------------------------------------------------- | ------------------------------------------- |
| Maria Ellis, residential         | $480 / Aug 12, 2026        | None; AC capacitor replacement                     | First contact and arrangement               |
| Theo Ramirez, residential        | $390 / Aug 5, 2026         | $300 partial payment; duct repair                  | Partial payer and correct remaining amount  |
| Keisha Patel, residential        | $1,140 / Jul 19, 2026      | Reported that repaired AC still leaks              | Work-quality dispute and pause              |
| Jordan Kim, residential          | $760 / Jul 25, 2026        | Reminder sent; now claims a bank transfer          | Already-paid claim without verified payment |
| Northside Dental LLC, commercial | $2,250 / Jun 30, 2026      | Receptionist answered earlier; rooftop unit repair | Human callback and prior-contact context   |
| Cedar Bakery LLC, commercial     | $910 / Jul 30, 2026        | Existing arrangement; air handler service          | Duplicate-arrangement prevention            |

Use **Vitest only** in the first build. Cover tenant isolation, role permissions, policy version pinning, the three core branches, human-request escalation, unclear-policy escalation, explicit confirmation, duplicate events, disconnects, and email rejection/retry. Complete manual browser voice walkthroughs for every seeded case and verify that each transcript, case status, task, arrangement, and received email matches the conversation.

The release is complete when a platform admin can create a company; its invited staff can sign in; company data stays isolated; an agent can conduct all three voice branches; valid arrangements are recorded; ambiguous or disputed cases reach the handoff queue; and checked emails send from a verified company domain to the seeded recipients.

Real outbound dialing remains a later integration. Before enabling it, review consent and applicable collections requirements, including the [FCC’s treatment of AI-generated voices](https://docs.fcc.gov/public/attachments/FCC-24-17A2.pdf).

## 6. First-release implementation contract

### Runtime, access, and template cleanup

The supported first-release runtime is Docker Compose with PostgreSQL (persistent volume), the ordinary Next.js Node web server, and a long-lived Hono Node process. Hono owns GPT-Live sideband connections and pg-boss workers. Migrations, platform bootstrap, and demo seed are explicit one-off commands after database readiness. The existing Cloudflare/vinext targets remain outside this release; supporting live calls or durable workers there requires a separately designed and tested session and queue architecture.

Only authenticated Next.js routes are browser-facing for collections data. Web calls Hono on the private Compose network with a server-only service credential. Hono validates the credential and re-reads the pending call, actor, membership, case, and policy data before executing any private tool or mutation. CORS is not authorization. Case, policy, task, domain, and email-status operations use authenticated Next.js route handlers backed by shared server functions; the existing tRPC package may continue to serve unrelated functions.

| Role           | Server-enforced access                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform admin | Create/list companies and invite their first company admin. This marker alone does not grant access to a company's cases or calls.          |
| Company admin  | Manage that company's settings, published policy, sender domain, and staff invitations; also perform agent work in the same company.        |
| Company agent  | Read and manage authorized cases, simulated calls, handoffs, history, and email status in their company. No company or team administration. |

The Better Auth plugin's default `owner` and `member` roles carry no product permission; invited staff receive only `admin` or `agent`. A client-provided organization ID is a selector at most. Server checks derive the allowed organization and role from the session and membership on every read and write, including Hono actions and jobs.

Self-serve company creation and open sign-up are closed; the platform admin creates companies and invites the first company admin, who may invite agents. Staff authentication mail uses a configured verified **platform** sender, distinct from each company's verified customer-mail domain.

### Public call and internal service boundary

| Owner   | Route                                       | Contract                                                                                                                                                                                                                                                                                                                                           |
| ------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js | `POST /api/calls`                           | Authenticated body `{ caseId, sdpOffer }`, optional `Idempotency-Key`; atomically create a pending `CallSession` with the case's active-call slot, then send its ID and trusted actor to Hono. Return `201 { callId, sdpAnswer, connectionState: "connecting" }`. A competing active call returns `409` without creating another provider session. |
| Next.js | `GET /api/calls/:id`                        | Authenticated, tenant-scoped persisted call, transcript, resolution, and connection snapshot. Never return private tool arguments or a provider credential.                                                                                                                                                                  |
| Next.js | `POST /api/calls/:id/end`                   | Authenticated, idempotent close request; return the same call ID, current terminal outcome, and `closing` or `closed` connection state on repeats.                                                                                                                                                                                                 |
| Hono    | `POST /internal/voice/sessions`             | Service-authenticated `{ callId, caseId, actorUserId, sdpOffer }`; revalidate the pending call and membership, use its pinned policy, create the GPT-Live session, attach sideband, persist provider state, and return `{ callId, sdpAnswer }`.                                                                                                    |
| Hono    | `POST /internal/voice/sessions/:callId/end` | Service-authenticated close and reconciliation. Business outcomes remain solely Hono-owned.                                                                                                                                                                                                                                                        |

Use the GPT-Live session API, not the older Realtime call API. Hono sends `POST /v1/live/sessions` with a `gpt-live-1` session, WebRTC SDP offer, and `gpt-6.1-sol` Responses delegation for reasoning and tools; it attaches to `wss://api.openai.com/v1/live/sessions/{session.id}/attach` with the server key. The browser receives only SDP and permitted lifecycle/caption/error events. Hono keeps all private tools and policy/case context server-side, with narrow client event permissions. Do not enable provider-side audio storage. The exact model IDs and API shapes appear in current OpenAI documentation. On October 9, 2026, the target project's API key received HTTP 200 with the matching model ID from `GET /v1/models/gpt-live-1` and `GET /v1/models/gpt-6.1-sol`. A real WebRTC session smoke test remains part of Step 3.

### Case and call transitions

`CollectionCase.status` is separate from `CallSession.outcome` and transport `connectionState`. Case status is a work state, not a payment ledger. A call stores the previous case status so an incomplete call can restore it.

| From                               | To                                             | Required action                                                                                                                                                                                                                                                     |
| ---------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready` or `arrangement_recorded`  | `in_call`                                      | Atomically create one pending call with an active-case slot, start lease, and pinned published policy version.                                                                                                                                                      |
| `in_call`                          | `arrangement_recorded`                         | Policy-backed, server-validated schedule and explicit customer confirmation of the read-back; store the schedule in call outcome JSON and case active-arrangement JSON without changing outstanding amount. An existing active arrangement forbids this transition. |
| `in_call`                          | `paused_for_review`                            | Commit a paid-claim or work-quality-dispute outcome and exactly one reconciliation or service-manager task. A claim does not record received payment.                                                                                                               |
| `in_call`                          | `escalated`                                    | Commit a human request, unclear/unsupported policy, account uncertainty, repeated confusion, or second-plan request and one callback task.                                                                                                                   |
| `in_call`                          | prior status                                   | Startup failure, interruption, or close before a committed business outcome; mark call `incomplete` or `failed`, create no arrangement or outcome email.                                                                                                            |
| `paused_for_review` or `escalated` | `ready`, `arrangement_recorded`, or `resolved` | Authorized staff records a note/evidence in the case timeline. Preserve any existing arrangement.                                                                                                                                                                   |
| `arrangement_recorded`             | `resolved`                                     | Authorized staff independently verifies resolution and records a case note; a promise or customer claim is insufficient.                                                                                                                                            |

`resolved` cannot start a new call until authorized staff explicitly reopens it with a case note. A start request against an active case returns a conflict; provider creation occurs only after the pending call wins the active slot. A stale pending call expires or is reconciled after failed startup/restart. Repeated end requests return the existing terminal state. Disconnect after a committed outcome closes transport without overwriting that outcome. An intentional safe end without business action is `no_outcome`; an unplanned loss before confirmation is `incomplete`. A human request or uncertainty about the account can create a callback escalation. Cedar's existing plan remains intact even if a second-plan request escalates.

Pin the policy version and Markdown snapshot at call start. The foundation schema uses Better Auth `Organization`, `Member`, `Invitation`, `Session.activeOrganizationId`, and `User.isPlatformAdmin`, plus only four application tables: `CompanySettings`, `CollectionCase`, `CallSession`, and `EmailMessage`. `CompanySettings` stores the current policy, compact policy history, and sender configuration as JSON. Every company-owned row carries `organizationId`. Amounts are decimal currency values. `CollectionCase` holds the authorized contact and other demo facts in `caseData`, notes, and one current follow-up. `CallSession` holds the active-case slot, plain text transcript from the start of the call, summarized API results, runtime JSON, final outcome JSON, and summary. `EmailMessage` holds the exact rendered content, one logical event key, provider ID, latest status, and latest error. The schema does not grant role permission: every route and Hono action still resolves it on the server.

Use stable keys for each provider event (`providerSessionId:eventId`), function action (`callId:functionCallId`), and customer email (`callId:outcomeKind:customer-followup`). Check and append provider/action keys within a locked or compare-and-swap update of the `CallSession` row; commit the one outcome only while it is empty. Enforce a unique active-case slot and unique email event key in the database. An event ID or client idempotency key is never an authorization token. This gives prototype-level duplicate safety without a separate event or audit ledger.

### Browser role-play and transcript

The signed-in staff member opens a company case and speaks as its customer or authorized contact. Next.js checks staff membership and case access before reserving the call; Hono rechecks the reservation, organization, actor, and pinned policy. The simulated caller is not asked for a separate code, name, role, or affirmation before case discussion. Persist the text transcript from the beginning of the conversation and show it on the call page; do not redact opening speech. Store no audio.

Each seeded case has an authorized billing contact for the staff role-play. Northside's earlier receptionist interaction remains historical case context; the staff member speaks as the authorized office manager for the live walkthrough. Seed Theo's prior $300 payment with $390 still outstanding, Keisha's leak complaint, Jordan's unverified transfer claim context, Northside's receptionist history, and Cedar's active arrangement as case JSON.

Prototype contact and transcript records remain in the local database until the operator deliberately removes that database; the first release has no automatic retention or deletion workflow. Use fictional case data and controlled inboxes. Application responses are tenant-scoped, and request/error logs must omit contact details, transcript text, SDP, credentials, and email bodies. A production deployment needs an explicit retention and deletion policy and implementation before real customer data is used.
