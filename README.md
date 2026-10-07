# Tribe

A quieter place to share ordinary moments with the people you choose. Tribe organizes personal relationships into nested private circles: 5 within 15 within 50 within 150. Wider sharing includes the smaller circles; public followers remain separate.

This is a fresh Expo and Neon rebuild. AT Protocol provides verified account identity and public-network access. Private photos, recipient grants and circle assignments stay in Tribe’s application backend, rather than public AT repositories.

## Run locally

Requirements: Node 22 or newer, pnpm 10.13.1, and Docker.

```sh
pnpm install
node scripts/setup-local.mjs
pnpm db:up
pnpm db:migrate:local
pnpm dev:seed
pnpm dev:local
```

In another terminal:

```sh
pnpm dev:web
# or a native development build
pnpm --filter @tribe/mobile ios
pnpm --filter @tribe/mobile android
```

For the local web preview, paste `.data/local-session.json` into the development sign-in screen. That session is created by a local-only seed script; the API has no demo-login or unverified identity exchange endpoint. Local fixture illustrations are synthetic. Development session controls are excluded from release builds.

On a physical phone, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your computer’s LAN address. For actual OAuth on a phone, use the HTTPS development API and a native build with the registered `tribe` callback scheme.

## Verify

```sh
# Create the isolated test database once
# This command assumes the Docker service is running.
docker compose exec -T postgres psql -U tribe -d postgres -c 'CREATE DATABASE tribe_test'
pnpm check
pnpm --filter @tribe/mobile export
pnpm exec playwright install chromium
pnpm exec playwright test
```

Tests refuse a database that is not named `tribe_test`. Browser tests use the explicitly local Docker database and seeded development sessions. CI runs type checks, transactional privacy tests, all-platform exports and browser flows.

## Layout

- `apps/mobile`: Expo Router screens, native sign-in return, private photos, composer, circles, activity, account settings and staff review.
- `apps/api`: Fastify API, OAuth, authorization, private media gateway and background jobs. Supports Node hosting or Neon Functions.
- `packages/domain`: nested circle rules and request contracts.
- `packages/db`: Postgres schema and versioned Drizzle migrations.
- `neon.ts`: branch-scoped API, private storage and scheduled background work.

## Identity and privacy

Sign-in uses the official server-side AT OAuth client. Only a verified OAuth DID can receive a Tribe session. A single-use completion code is bound to a mobile verifier. Refresh tokens rotate and replay revokes the session.

Posting checks the preview against the actual recipient snapshot inside a transaction. Adding someone never exposes older posts. Moving tiers preserves historical grants. Removing or blocking revokes access; re-adding or unblocking does not restore it. Every private media fetch goes through the authenticated gateway. Privacy is server access control, not end-to-end encryption or protection against screenshots.

An owner’s circle labels and recipient roster are never included in recipient post responses. Comments reveal other participants, so the app does not promise participant anonymity. The public Network surface is explicitly public and separate from private sharing.

## Deployment and status

The isolated Neon development branch is `dev-tribe-rebuild` in the existing Tribe project. Its API is [available here](https://br-round-tree-b5lbzcui-api.compute.c-7.us-east-2.aws.neon.tech/health). The GitHub Pages workflow publishes a web preview using that backend. Preview infrastructure is distinct from production; no production database migration is implied by this repository.

See [verification results](docs/operations/VERIFICATION.md), [runtime decisions](docs/decisions/001-neon-runtime.md), [deployment and release checks](docs/operations/DEPLOYMENT.md), [privacy and recovery](docs/operations/PRIVACY_AND_RECOVERY.md), [product requirements](docs/PRD.md), and [replacement plan](docs/REBUILD_PLAN.md).

AI circle classification, public publishing, messages, video and stories are deliberately outside this release. Native device sign-in, App Store/TestFlight signing, push credentials, accessibility review on devices, and the friendship-network beta remain release gates. A successful JavaScript export does not replace those checks.

The original implementation is preserved in Git history, branch `legacy/pre-rebuild`, and annotated tag `legacy-before-rebuild-20261007`.
