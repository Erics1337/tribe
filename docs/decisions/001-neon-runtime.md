# Runtime decisions for the implemented rebuild

October 7, 2026

The original rebuild plan proposed a managed Node container and a separate S3 provider. The implemented development environment uses Neon Functions and Neon's private object storage in the existing Tribe project. This keeps the database, photo bucket, API and scheduled jobs together on an isolated development branch. The API also has a production Node bundle and a standalone worker for container hosting if needed.

The initial Neon Auth service is preserved because it was provisioned with the project. Tribe authenticates through the official AT OAuth Node SDK and issues its own opaque application sessions; Neon Auth does not replace verified AT identity.

The final workspace has `apps/mobile`, `apps/api`, `packages/domain` and `packages/db`. Request contracts live in the domain package, the AT adapter lives inside the API, and reusable mobile controls live inside the Expo app. These modules can become separate packages when a second consumer needs them.

GitHub Pages hosts the Expo browser preview. It talks to the isolated development API. A branch-specific Pages deployment is independent of merging the repository replacement. Native distribution uses Expo development builds and the supplied EAS profiles; signing, a project ID and live device verification remain required.

Private moments and circle assignments never enter public AT repositories. Public Network reads are a separate public surface. The backend owns recipient snapshots and enforces revocation on every fetch, including photos, replies and notification delivery. This is access-controlled private storage, not end-to-end encryption.
