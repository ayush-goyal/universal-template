# Local collections demo

The supported local runtime is Docker Compose: PostgreSQL, the Next.js Node web app, and a private Hono Node service. The browser opens only the web app on `http://localhost:3000`. Hono listens on port 3001 inside the Compose network and accepts internal actions only with `HONO_SERVICE_TOKEN`; CORS is not authorization. Cloudflare Workers, native billing, telephony, and payment collection are outside this demo.

## Configure

1. Copy `.env.example` to `.env`. Keep `.env` private and uncommitted.
2. Set `POSTGRES_PASSWORD` to a strong URL-safe value (letters, digits, `_`, or `-`). Compose builds the internal `DATABASE_URL` and `DATABASE_DIRECT_URL` from it. `POSTGRES_USER` and `POSTGRES_DB` default to `hvac`.
3. Set `HONO_SERVICE_TOKEN` to an unpredictable secret. `HONO_INTERNAL_URL` is `http://server:3001` inside Compose; the browser never receives the token or calls Hono directly.
4. Set `BETTER_AUTH_SECRET`, `SITE_URL=http://localhost:3000`, and a verified `PLATFORM_FROM_EMAIL` for staff invitations, verification, and password resets. Configure `RESEND_API_KEY` for real mail. Company customer email requires that company's separately verified Resend domain.
5. Set `OPENAI_API_KEY` in the target project before testing live voice. Model entitlement must be checked with that key.
6. Set `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` only for the bootstrap command. The bootstrap must reject an existing non-platform user at that address.

The `tools` service uses the same workspace image as web and is available only for explicit one-off commands. It receives container-local database URLs; do not use `localhost` as the database host inside a container.

## Start and provision

From the repository root:

```bash
docker compose up -d db
docker compose run --rm tools --filter @acme/db exec prisma migrate deploy
docker compose run --rm tools --filter @acme/auth platform:bootstrap
docker compose run --rm tools --filter @acme/db db:seed
docker compose up --build -d server web
docker compose ps
```

`platform:bootstrap` and `db:seed` are the agreed command names for their respective implementation lanes. Run those commands once the auth and schema lanes have supplied them. The seed should be idempotent; rerunning it must not duplicate the company or cases. Migrations use `deploy` so this startup path never resets data.

Open `http://localhost:3000/sign-in` and sign in as the bootstrapped platform admin. Create the company and invite its first admin; company admins can invite agents. Staff email must arrive from `PLATFORM_FROM_EMAIL`. Before testing customer mail, verify the company's sender domain in the app and configure controlled inboxes for the seeded contacts.

The six browser voice walkthroughs and the expected case, task, transcript, arrangement, and email results are listed in `TASKS.md` Step 6. Calls are simulated in the browser; they do not dial a phone or collect payment. The Hono `/health` endpoint is used for container startup. The Node entry point checks database connectivity and starts registered job workers before opening the HTTP listener.

## Inspect and stop

```bash
docker compose logs -f server web
docker compose exec db psql -U hvac -d hvac
docker compose down
```

`docker compose down` preserves the named PostgreSQL volume. Never use `docker compose down -v` for this demo. The Node service handles `SIGTERM` and `SIGINT`: it stops accepting requests, stops registered job workers, and disconnects Prisma. When pg-boss delivery is registered, its worker must retry uncompleted jobs after a restart and apply the stored logical email event key plus the same Resend idempotency key on every attempt. Outcome writes need a durable outbox record in the same database transaction so a crash between outcome commit and enqueue cannot lose email work.
