# HVAC collections implementation checklist

Source of truth: [SPEC.md](SPEC.md). Work through the steps in order. Check a task only after its implementation and relevant verification are complete. Keep this file current as decisions are made; record any product change in `SPEC.md` first.

**First-release boundary:** browser-only simulated voice calls, one seeded company and six cases, real multi-company access controls, real email delivery to controlled inboxes. No phone network, payment processing, accounting ledger, or stored call audio.

## Current starting point

The repo already has pnpm/Turborepo, Next.js, Hono, Prisma/PostgreSQL, a basic Better Auth setup, Tailwind/shadcn components, TanStack Query, React Hook Form, Zod, and Vitest. These are scaffolding, not completed collections features. The dashboard is still a generic Pro chat; Hono exposes a health route and user-count example; the database has no company or collections records; there is no Docker Compose stack or voice/email job pipeline. Auth email uses a placeholder sender, and company membership/roles are not implemented.

## Parallel agent plan

The numbered steps below describe **integration order**, not a requirement to finish every task in a step before starting another lane. Run up to three coding/research agents alongside one coordinator. Give each coding agent its own worktree/branch; a shared checkout makes Prisma migrations, dependency changes, and `pnpm verify` collide. Ensure `SPEC.md` and `TASKS.md` are committed or copied into new worktrees; worktrees do not copy uncommitted files.

### Dispatch and merge rules

- [x] **P.1** Make `SPEC.md` and this checklist available in each agent worktree. Preserve the other uncommitted changes already present in the main checkout.
- [x] **P.2** Assign one coordinator to finalize Step 0 contracts, own the shared integration files, and update task checkboxes after reviewing merged work.
- [x] **P.3** Give each agent its lane's task IDs and owned paths. Agree on request/response shapes, schema names, event keys, and role checks before agents implement opposite sides of an interface. Re-frozen around the approved four-table demo schema.
- [ ] **P.4** Merge one Prisma migration stream at a time. Coordinate dependency additions through one owner of `pnpm-workspace.yaml`, package manifests, and `pnpm-lock.yaml`.
- [ ] **P.5** Have each agent report changed files, test results, interface changes, and unfinished dependencies. Run the phase gate and `pnpm verify` in the integrated checkout before checking off a phase.

The coordinator owns `SPEC.md`, `TASKS.md`, `packages/db/prisma/schema.prisma` after the schema lane lands, shared package/router entry points, `apps/server/src/app.ts`, and the workspace catalog/lockfile. Agents should add isolated modules and route folders, then ask the coordinator to wire shared entry points. A task split between backend and UI stays unchecked until both pieces work together.

### Agent lanes and earliest start

| When                                                 | Agent lane and task IDs                            | Owned work                                                                                                 | Dependency / merge gate                                                                        |
| ---------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Now — contract research**                          | Runtime: **0.1, 0.6**                              | Review Docker/Workers and template billing requirements; return a runtime and cleanup proposal.            | Coordinator accepts the runtime decision.                                                      |
| **Now — contract research**                          | Voice/API: **0.2, 0.3**                            | Verify model/API availability and propose public call, internal Hono, and sideband contracts.              | Coordinator freezes route payloads and service ownership.                                      |
| **Now — contract research**                          | State/privacy: **0.4, 0.5**                        | Propose case/call transitions, staff authorization, and required seed facts.                                | Coordinator records the agreed transition and role-play rules.                                 |
| **After Step 0 contract**                            | Schema/seed: **1.5–1.12, 1.19–1.21**               | `packages/db/**` only, including the single migration stream and seed.                                     | Land schema before auth and product API integration.                                           |
| **After schema shape is agreed**                     | Auth/access: **1.13–1.18**, platform UI of **2.1** | `packages/auth/**`, auth pages/client, new authorization helpers, platform-company/invite routes and page. | Integrate after migration; use runtime lane's platform sender contract.                        |
| **After runtime contract**                           | Local stack: **1.1–1.4**                           | Compose/Docker files, `.env.example`, `apps/web/env.ts`, and new service-auth/job startup modules.         | Integrate with auth and Hono route registration at the Step 1 gate.                            |
| **After Step 1 service contracts**                   | Case backend: backend of **2.2–2.4**               | New case services and `apps/web/app/api/cases/**`; tenant-scoped reads/writes.                             | Publish types/endpoints to case UI; coordinator wires shared router exports.                   |
| **After case read/write shapes are agreed**          | Case UI: company UI of **2.1–2.4, 2.8–2.9**        | Dashboard overview and dedicated Cases pages, case detail, call pages, and case components.                | Keep overview metrics labeled as simulated and case rows backed by the case API.                |
| **After Step 1 authorization**                       | Settings and follow-ups: **2.5–2.7** and **5.1**   | Case-level follow-up controls, Settings with policy, sender domain and email history, and team screens.   | Share one company navigation with Dashboard and Cases as primary pages.                       |
| **After call/sideband contract**                     | Hono voice: backend of **3.3–3.5, 3.7–3.8**        | New `apps/server/src/voice/**` modules and Vitest cases; export route registration.                        | Coordinator wires `app.ts`; agree on outcome tool contract first.                              |
| **After public call contract**                       | Browser/call routes: **3.1–3.2, 3.6**              | `apps/web/app/api/calls/**` and new call-workbench components/pages.                                       | Can use a fake Hono service while voice lane runs; integrate at Step 3 gate.                   |
| **After outcome action contract**                    | Outcome engine: **4.1–4.7**                        | New outcome/policy-check/action modules and Vitest cases, separate from session transport.                 | Hono voice lane calls this engine; merge and test all branches at Step 4 gate.                 |
| **After `EmailMessage` and outcome-event contracts** | Email delivery: **5.4–5.6**                        | New pg-boss/outbox/Resend delivery and email-status modules.                                               | Can start while voice/outcomes are built; only one owner changes job registration.             |
| **After outcome-event contract**                     | Email draft/checker: **5.2–5.3**                   | New draft, placeholder-rendering, and factual-check modules with Vitest cases.                             | Wire to delivery after Step 4 outcomes are integrated.                                         |
| **After integration**                                | Acceptance: **5.7, 6.1–6.10**                      | Each lane owns its relevant Vitest coverage; coordinator runs full gate and browser/inbox walkthrough.     | Use separate databases/inboxes for parallel manual runs; otherwise run the six cases serially. |

An agent's brief should name the table row, task IDs, owned paths, agreed interfaces, and phase gate. Ask it to implement and test its slice, avoid unrelated edits, and return a concise handoff. Start the three **Now** rows immediately; after their contracts are accepted, replace them with the three Step 1 coding lanes.

## Step 0 — Lock the implementation contract

- [x] **0.1** Confirm the local first-release runtime: Docker Compose runs Next.js, a long-lived Node Hono voice/job service, and PostgreSQL. Decide how the existing Cloudflare Workers deployment relates to this release; do not assume it can host the sideband connection or pg-boss worker.
- [x] **0.2** Confirm that the target OpenAI project exposes the specified `gpt-live-1` and `gpt-6.1-sol` models and the current WebRTC/sideband flow. Record any required model or API change in `SPEC.md` before implementation.

  Current docs confirm both model IDs and the GPT-Live session/sideband API. On October 9, 2026, the target project's key returned HTTP 200 and the matching ID for both models from `GET /v1/models/:id`. A full WebRTC smoke test remains in Step 3.

- [x] **0.3** Define API ownership: required public call routes are `POST /api/calls`, `GET /api/calls/:id`, and `POST /api/calls/:id/end` in Next.js; Hono owns session events and business tool execution. Map case, policy, task, domain, and email-status operations to authenticated Next.js routes backed by shared server functions, while preserving the existing tRPC package where it is useful.
- [x] **0.4** Write a case/call state-transition table, including `ready`, `in_call`, `paused_for_review`, `arrangement_recorded`, `escalated`, `resolved`, and a separate `incomplete` call outcome. Define what happens on an interrupted call, concurrent start, repeated end, a case with an existing arrangement, and staff-confirmed resolution after review.
- [x] **0.5** Define the browser role-play boundary: signed-in staff selects an authorized case and speaks as its customer. There is no separate simulated-customer identity or code check; keep the Northside receptionist interaction as historical context.
- [x] **0.6** Decide which template-only screens and required Stripe configuration should be removed or made optional so collections sign-in and dashboard work without a billing subscription. Keep changes outside the browser release, including the native app, separate.

  Stripe cleanup is being handled by the user; agents should avoid overlapping billing edits.

**Gate:** the call boundary, state transitions, staff authorization, and runtime are documented well enough to implement without inventing behavior inside handlers.

## Step 1 — Foundation, tenancy, and seed data

### Local stack and configuration

- [ ] **1.1** Add Docker Compose services for PostgreSQL, web, and Hono voice/job service with persistent database storage, health checks, start order, and a documented migrate/seed command.
- [ ] **1.2** Add and validate required environment variables in the root `.env.example` and `apps/web/env.ts`; keep OpenAI, Resend, service-auth, and database credentials server-only. Document local setup and platform/company sender-domain prerequisites.
- [ ] **1.3** Give Next.js an authenticated, server-to-server path to Hono; reject direct unauthenticated calls to Hono's internal voice/action endpoints.
- [ ] **1.4** Define where pg-boss starts, how jobs are registered, and how shutdown/restart resumes queued work without duplicating effects.

### Schema and invariants

- [ ] **1.5** Add Better Auth organization, membership, invitation, and active-organization schema through a Prisma migration. Add a separate platform-admin marker or equivalent server-enforced global role.
- [ ] **1.6** Add `CompanySettings` with organization ownership, current policy Markdown/version/history JSON, sender configuration JSON, and timestamps.
- [ ] **1.7** Add `CollectionCase` with customer name, invoice, exact outstanding amount, status, `caseData` JSON for contact/service/arrangement facts, notes, and one current follow-up JSON object. Validate dates and amounts in API code.
- [ ] **1.8** Publish policy by atomically updating current Markdown/version and appending to `CompanySettings.policyHistory`. Pin the version and text snapshot on each call.
- [ ] **1.9** Add only `CallSession` and `EmailMessage` beyond settings and cases. Store text transcript, API results, and one structured outcome on the call; keep exact outgoing content/status on the email. Store no audio or separate policy, handoff, payment, event, delivery-attempt, or audit ledger tables.
- [ ] **1.10** Put `organizationId` on every company-owned record; add indexes and tenant-safe relationships for common case, call, and email queries.
- [ ] **1.11** Enforce one logical outcome per call, pinned policy snapshot, one active call per case, and one email per outcome key. Keep processed provider/action keys in `CallSession.sessionData` and update them under a row lock or compare-and-swap transaction.
- [ ] **1.12** Create and apply migrations using the repo's Prisma workflow; never edit generated Prisma output or reset the database.

### Authentication and authorization

- [ ] **1.13** Add Better Auth's organization plugin and client plugin with company roles `admin` and `agent`; explicitly handle the plugin's default owner/member roles so they cannot bypass the product permission matrix. Restrict organization creation to the platform admin and prevent open self-serve company creation.
- [ ] **1.14** Add an idempotent bootstrap command for the platform admin that cannot silently promote an arbitrary signed-in user.
- [ ] **1.15** Implement platform-admin company creation and first-admin invitation; allow company admins to invite/manage agents. Complete invitation acceptance, email verification, and password reset. Configure the platform's verified sender for all staff emails and replace the current placeholder sender.
- [ ] **1.16** Centralize server-side session, membership, organization, and role checks. Resolve access for every page read, route, mutation, Hono action, job, and transcript/email lookup; never trust a client-supplied organization ID as authorization.
- [ ] **1.17** Define and enforce the permission matrix: platform admin manages companies; company admin manages settings, policy, sender domain, and team; agents manage authorized cases, calls, and handoffs. Record high-level staff notes and call outcomes without building an audit ledger.
- [ ] **1.18** Protect private contact and transcript data in responses/logs and document retention/deletion expectations for the prototype.

### Demo seed

- [ ] **1.19** Add an idempotent seed command for one company, its published prose policy with explicit example payment-plan limits, staff roles, and the six cases from `SPEC.md` with accurate dates, amounts, prior contacts, and controlled customer email addresses. Do not fake sender-domain verification in seed data.
- [ ] **1.20** Seed Theo's prior $300 payment as context while keeping the outstanding amount at $390; seed Keisha's dispute, Jordan's payment claim context, Northside's receptionist history, and Cedar's existing arrangement as case JSON so each edge case is reproducible.
- [ ] **1.21** Create a second organization in Vitest fixtures to prove isolation without adding a second demo company.

**Gate:** a bootstrapped platform admin can create a company, invited staff can sign in, and cross-company reads and writes fail on the server.

## Step 2 — Collections and administration UI

- [ ] **2.1** Make `/dashboard` an overview with clearly labeled simulated metrics and graphs. Put the company worklist at `/dashboard/cases`, with a separate platform-admin company/access area. Auth-gate these routes by server-resolved role.
- [ ] **2.2** Build the Cases worklist with search, status and follow-up flags, case controls, and clear empty/loading/error states. Keep real case records separate from simulated dashboard metrics.
- [ ] **2.3** Build manual case creation and editing with React Hook Form/Zod, server validation, contact preferences, assignment, and a simple case note for material staff changes. Prevent edits from crossing organizations or corrupting a live call.
- [ ] **2.4** Build case detail with invoice/service context, prior and new notes from case timeline JSON, status, arrangement, and assigned agent.
- [ ] **2.5** Show human follow-ups as flags and actions in Cases and case detail: reason, transcript context, status, callback workflow, and staff notes. Surface reconciliation, service-manager, and general escalation tasks distinctly; allow authorized staff to record a verified resolution after review. Do not add a separate follow-ups page.
- [ ] **2.6** Build Settings for company profile, policy, email sender setup and message history, plus team/invitation screens for permitted admin roles. Do not add a separate email navigation tab.
- [ ] **2.7** Build Markdown policy editor, preview, publish action, active-version indicator, and immutable version history. A live call retains its starting policy version after a new publication.
- [ ] **2.8** Show call history as expandable records within each case page, including speaker-formatted transcript, structured resolution, summary, policy version, and incomplete/failed state. Paint the case first, then fetch history and prefetch call details after initial paint. Scope every query by membership; old standalone call links redirect to the case.
- [ ] **2.9** Use server-rendered initial reads and TanStack Query for changing call, handoff, and email state. Keep the live voice workbench as a client component.

**Gate:** staff can manage seeded and manually entered cases, publish policy, inspect history, and work handoffs without using database tools.

## Step 3 — Browser voice and Hono session lifecycle

- [ ] **3.1** Build the case voice workbench with microphone permission, WebRTC offer/answer, audio output, start/mute/end controls, connection state, live captions, and accessible failure/retry states.
- [ ] **3.2** Implement authenticated `POST /api/calls`: validate case access and eligibility, create a pending `CallSession` with the case's unique active slot, then pass the offer and trusted call/actor identity to Hono.
- [ ] **3.3** In Hono, revalidate the pending call, load the case, contact history, company settings, and pinned policy; create the OpenAI live session, attach the server-side connection early, save its OpenAI session ID, and return `callId` plus SDP answer.
- [ ] **3.4** Make Hono the sole owner of private tools and action writes. Register case lookup, outcome, and handoff tools with strict schemas and server authorization; the browser receives only data needed for voice/captions.
- [ ] **3.5** Persist ordered text transcript and processed provider/action keys in `CallSession` JSON. Handle partial transcripts, duplicated/out-of-order events, interruptions, and finalization without storing audio.
- [ ] **3.6** Implement authenticated `GET /api/calls/:id` for persisted state and `POST /api/calls/:id/end` for idempotent close/cleanup. Reconcile WebRTC, sideband, and database state after disconnects and service restarts.
- [ ] **3.7** Build the voice instructions: introduce the company and AI identity, use the staff-selected case context without a simulated-customer code gate, and obey published policy and escalation rules. Persist transcript text from the opening exchange.
- [ ] **3.8** Ensure lost connection before explicit outcome confirmation records an `incomplete` call and cannot create an arrangement or confirmation email.

**Gate:** a browser can complete a simulated call while Hono persists the transcript and state; duplicate clicks/events and dropped connections have safe results.

## Step 4 — Outcomes, policy decisions, and handoffs

- [ ] **4.1** Implement the **already-paid claim** branch: capture claimed date, method, and reference; stop negotiation; add a `payment_claim` contact event; create one reconciliation handoff; never mark payment received from the claim.
- [ ] **4.2** Implement the **work-quality dispute** branch: capture the issue and relevant service details; stop collecting the disputed amount; add a dispute event; create one service-manager handoff.
- [ ] **4.3** Implement **payment arrangements** with `gpt-6.1-sol` self-check returning a proposed schedule, exact supporting policy passage, and explanation. Server checks that the passage exists in the pinned policy, amounts and dates are valid, the case is eligible, no conflicting plan exists, and the customer explicitly confirmed the read-back before committing once.
- [ ] **4.4** Preserve the case's outstanding amount when an arrangement is recorded; the schedule expresses a promise, not a received payment.
- [ ] **4.5** Implement escalation for human requests, unclear policy, unsupported terms, account uncertainty, repeated confusion, disputes, and paid claims. Persist one assignable callback task with reason and transcript context; do not imply a live transfer.
- [ ] **4.6** Persist the final outcome kind/data JSON and concise call summary. Apply only permitted case-status transitions and add a high-level case timeline note where useful.
- [ ] **4.7** Make all outcome, task, arrangement, and summary writes transactional/idempotent against repeated provider events, retries, and repeated UI actions.

**Gate:** Maria can confirm a valid plan; Keisha reaches service review; Jordan reaches reconciliation; human requests, ambiguous terms, and Cedar's existing arrangement cannot produce an invalid new plan.

## Step 5 — Company email and delivery

- [ ] **5.1** Build company sender-domain setup using `CompanySettings`: create the domain in Resend, display required DNS records, refresh verification state, and block customer sends until that company's domain is verified.
- [ ] **5.2** After a completed arrangement, dispute, or payment-claim outcome, use `gpt-6.1-sol` to draft the appropriate subject and prose. Insert authoritative names, amounts, dates, and other facts via controlled placeholders when rendering.
- [ ] **5.3** Validate draft against the recorded outcome, allowed recipient, verified company sender, known links, and supported claims. Reject unsupported or inconsistent drafts and create a staff review task; do not send on incomplete calls or escalation-only outcomes.
- [ ] **5.4** Persist the exact rendered subject/body, organization/case/call/recipient, logical event key, Resend ID, attempt count, status, and latest error on one `EmailMessage` row. Use that row as a durable outbox so a committed outcome is not lost before enqueueing.
- [ ] **5.5** Deliver with pg-boss retries and the same Resend idempotency key for the logical message. Enforce a unique database event key as the long-term duplicate guard, including after the provider's idempotency window.
- [ ] **5.6** Reconcile provider send/delivery failures and expose per-case email status/history plus a staff review/retry path that cannot create an unintended second email.
- [ ] **5.7** Configure controlled working inboxes for all seeded recipients that should receive messages; verify the exact received subject/body and from-domain against the recorded outcome.

**Gate:** each eligible completed outcome produces at most one fact-checked customer email from its company's verified domain, with visible delivery state.

## Step 6 — Verification and release walkthrough

### Automated tests (Vitest only in this build)

- [ ] **6.1** Test tenant isolation and role permissions for every read/write surface, including direct URL/ID substitution, Hono internal calls, jobs, transcripts, and sender domains.
- [ ] **6.2** Test organization bootstrap/invites and policy publication/version pinning across an active call.
- [ ] **6.3** Test all three outcome branches, staff-selected case authorization, human-request and unclear-policy escalation, invalid dates/amounts, explicit read-back confirmation, and unchanged outstanding balance after a plan.
- [ ] **6.4** Test duplicate OpenAI events, concurrent/repeated call actions, existing arrangements, service restart/disconnect, and incomplete-call behavior.
- [ ] **6.5** Test email draft rejection, wrong recipient/unverified domain, single-send idempotency, provider failure, retry, and delivery-state reconciliation.
- [ ] **6.6** Run `pnpm verify` before marking implementation complete; use `pnpm verify:all` after shared config/tooling changes. Fix root causes and keep the final diff focused.

### Manual browser and inbox walkthrough

| Case                 | Call to perform                                                                           | Verify afterward                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Maria Ellis          | Role-play Maria, agree to a policy-supported plan, and explicitly confirm the read-back.  | One arrangement, unchanged $480 outstanding amount, transcript/summary, one confirmation email. |
| Theo Ramirez         | Role-play Theo and discuss only the $390 remaining balance after the prior $300 payment.  | Correct context and amounts throughout transcript, outcome, and any email.                      |
| Keisha Patel         | Report the still-leaking AC repair.                                                       | Negotiation stops; service-manager task, dispute status/event, acknowledgement email.           |
| Jordan Kim           | Claim a bank transfer and provide date/method/reference.                                  | No paid status; one reconciliation task, claim event, acknowledgement email.                    |
| Northside Dental LLC | Role-play the office manager, mention earlier receptionist contact, and request a callback. | Human-request escalation; receptionist history remains context; no arrangement or email.       |
| Cedar Bakery LLC     | Request a second arrangement while one already exists.                                    | No duplicate plan or confirmation email; safe escalation/review outcome.                        |

- [ ] **6.7** Complete each row above in the real browser and check the persisted transcript, case status, task, arrangement, and received email where applicable.
- [ ] **6.8** Repeat a call with a human-callback request and one with an abrupt disconnect before confirmation; confirm the first creates no arrangement or customer email, and the second cannot commit an unconfirmed outcome. Check the text transcript from the opening exchange.
- [ ] **6.9** Create a second company through the platform-admin UI, invite its first admin, and prove both companies' staff cannot see or mutate each other's cases, policies, calls, tasks, domains, or email history.
- [ ] **6.10** Document a reproducible local demo: environment setup, Docker Compose startup, migration/seed/bootstrap, sender-domain DNS verification, test inboxes, and the six walkthrough scripts.

**Release complete when:** a platform admin creates a company; invited company staff sign in; company data remains isolated; agents complete the three voice branches; valid plans are recorded once; ambiguous/disputed/paid-claim cases reach the handoff queue; and checked emails arrive from a verified company domain. Real outbound dialing remains a later integration and requires the separate consent/collections review called out in `SPEC.md`.

## Implementation references

- [Better Auth organization plugin](https://better-auth.com/docs/plugins/organization)
- [OpenAI server-side voice controls](https://developers.openai.com/api/docs/guides/voice-server-controls)
- [Resend domain API](https://resend.com/docs/api-reference/domains/create-domain) and [idempotency keys](https://resend.com/changelog/idempotency-keys/)
