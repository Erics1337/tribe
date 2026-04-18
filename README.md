# Tribe

Tribe is a relationship-first social app scaffolded as a `pnpm` monorepo with:

- `apps/mobile`: Expo Router React Native client for iOS and Android
- `apps/api`: Fastify API with Drizzle-based Postgres compatibility
- `packages/shared`: shared product types, validation schemas, and domain helpers

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

   For real AT Protocol OAuth, fill in the blank `EXPO_PUBLIC_ATPROTO_CLIENT_ID`, `EXPO_PUBLIC_ATPROTO_CLIENT_URI`, and `EXPO_PUBLIC_ATPROTO_REDIRECT_URI` values in `apps/mobile/.env` before using the native iOS build.

3. Start the API:

   ```bash
   pnpm dev:api
   ```

4. Start the mobile app:

   ```bash
   pnpm dev:mobile
   ```

5. Or start both the API and iOS simulator flow together:

   ```bash
   pnpm dev:ios
   ```

6. To run a native iOS development build with custom native modules such as AT Protocol OAuth:

   ```bash
   pnpm dev:ios:native
   ```

7. To generate a free-hosted OAuth metadata site for a Cloudflare Pages-style hostname:

   ```bash
   pnpm atproto:prepare-pages -- --host tribepreview.pages.dev
   ```

   That writes a deployable static site to `dist/atproto-oauth-site` and prints the exact mobile env values to copy into `apps/mobile/.env`.

## Notes

- The API runs against in-memory `PGlite` if `DATABASE_URL` is unset, and it switches to Postgres-compatible mode when `DATABASE_URL` is provided.
- Supabase is intended as the managed Postgres and storage layer behind the API, not as the client-auth boundary.
- AT Protocol OAuth is wired as the intended sign-in path, but it still needs hosted client metadata and environment-specific runtime setup before the production flow can fully complete. The mobile app includes a demo sign-in path so the product flows remain usable locally.
- `pnpm dev:ios` uses Expo Go. That is enough for the demo/local flow, but Expo Go cannot load `@atproto/oauth-client-expo`; real AT Protocol sign-in needs a native development build.
- `pnpm dev:ios:native` uses `expo run:ios` and requires local Xcode/iOS simulator tooling. On first run it will generate native project files and compile the iOS app.
- The native redirect URI must match the app scheme in `apps/mobile/app.config.ts`. The mobile app now derives its scheme from `EXPO_PUBLIC_ATPROTO_REDIRECT_URI`, so changing that value requires rebuilding the iOS development app.
- A free `*.pages.dev` host works for development. The helper command reverses the host labels into the native callback scheme for you, so `tribepreview.pages.dev` becomes `dev.pages.tribepreview:/auth/callback`.
