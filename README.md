# Tribe

> A relationship-first social app informed by social brain theory, rebuilt for a world with portable identity.

![Friends gathered around a table](https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&q=80&w=1800)

Tribe is a mobile-first social product for people who want a calmer, more intentional network. Instead of flattening everyone into the same follower graph, Tribe organizes relationships into bounded circles inspired by social brain theory and Dunbar-style limits:

- `inner` up to 5
- `close` up to 15
- `tribe` up to 50
- `village` up to 150

It is also the latest step in a much longer product journey.

## Origin Story

Tribe is an evolution of earlier attempts to build socially healthier software around the science of human relationship limits.

About five years ago, that idea started as **Social Brain Network**, an Instagram-style social app built around grouping relationships according to social brain theory. It aimed at the right problem, but ran into the classic cold start problem: a better social graph model does not matter much if your people are not there yet.

That led to a simpler follow-up called **Social Brain Contacts**, a mobile app that grouped people from your phone contacts into meaningful relationship layers. It reduced the cold start problem by using a graph users already had, but it also gave up the power of a portable online identity and a shared networked social layer.

Tribe is the next swing:

- keep the science-informed model of relationship tiers
- keep the emphasis on intentional social design
- avoid starting from zero
- use the **AT Protocol** so identity is portable and infrastructure is federated
- tap into an existing online social graph instead of hoping everyone joins a brand-new network from scratch


## Why This Exists

Most social apps optimize for reach, engagement, and scale. Tribe is designed around a different premise: people have finite attention, finite intimacy, and finite relational bandwidth.

Tribe is for users who want:

- a smaller and quieter social layer
- audience control that maps to real relationships
- identity they can carry with them
- a path beyond the cold start problem of new social apps

## What The Repo Contains

This repo is a `pnpm` monorepo with:

- `apps/mobile`: Expo Router React Native client for iOS and Android
- `apps/api`: Fastify API with Drizzle-based Postgres compatibility
- `packages/shared`: shared product types, validation schemas, and domain helpers

At the moment, the project uses AT Protocol primarily for identity and authentication. The broader vision is a product where portability, federation, and science-informed social design reinforce each other.

## Current Product Shape

Today the app includes:

- AT Protocol sign-in with native OAuth on iOS development builds
- a demo/local sign-in path for faster product iteration
- onboarding that asks users to shape their circles intentionally
- tier-based feeds and posting
- private relationship tiers rather than one flat friend/follower model

The long-term direction includes deeper Bluesky and AT Protocol interoperability, but the current implementation is intentionally scoped so the core product can be tested quickly.

## Local Development

This repo requires Node.js `20.19.4` or newer.

1. Install dependencies:

   ```bash
   nvm use || nvm install 20.19.4
   pnpm install
   ```

2. Copy env files:

   ```bash
   cp .env.example .env
   cp apps/mobile/.env.example apps/mobile/.env
   ```

3. For real AT Protocol OAuth, fill in the blank values in `apps/mobile/.env`:

   - `EXPO_PUBLIC_ATPROTO_CLIENT_ID`
   - `EXPO_PUBLIC_ATPROTO_CLIENT_URI`
   - `EXPO_PUBLIC_ATPROTO_REDIRECT_URI`

4. Start the API:

   ```bash
   pnpm dev:api
   ```

5. Start the mobile app:

   ```bash
   pnpm dev:mobile
   ```

6. Or start both the API and iOS simulator flow together:

   ```bash
   pnpm dev:ios
   ```

7. To run a native iOS development build with custom native modules such as AT Protocol OAuth:

   ```bash
   pnpm dev:ios:native
   ```

8. To generate a free-hosted OAuth metadata site for a Cloudflare Pages-style hostname:

   ```bash
   pnpm atproto:prepare-pages -- --host tribepreview.pages.dev
   ```

   That writes a deployable static site to `dist/atproto-oauth-site` and prints the exact mobile env values to copy into `apps/mobile/.env`.

## Development Notes

- The API runs against in-memory `PGlite` if `DATABASE_URL` is unset, and switches to Postgres-compatible mode when `DATABASE_URL` is provided.
- Supabase is intended as the managed Postgres and storage layer behind the API, not as the client-auth boundary.
- `pnpm dev:ios` uses Expo Go. That is enough for the demo/local flow, but Expo Go cannot load `@atproto/oauth-client-expo`; real AT Protocol sign-in needs a native development build.
- `pnpm dev:ios:native` uses `expo run:ios` and requires local Xcode and iOS simulator tooling. On first run it will generate native project files and compile the iOS app.
- The native redirect URI must match the app scheme in `apps/mobile/app.config.ts`. The mobile app derives its scheme from `EXPO_PUBLIC_ATPROTO_REDIRECT_URI`, so changing that value requires rebuilding the iOS development app.
- A free `*.pages.dev` host works for development. The helper command reverses the host labels into the native callback scheme for you, so `tribepreview.pages.dev` becomes `dev.pages.tribepreview:/auth/callback`.
