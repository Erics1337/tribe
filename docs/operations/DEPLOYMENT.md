# Tribe deployment and release checks

The rebuild uses the existing Tribe Neon project in AWS us-east-2. Development runs on branch `dev-tribe-rebuild`; the existing production branch is preserved. `neon.ts` retains the initially provisioned Neon Auth service, but Tribe account sessions are issued from verified AT OAuth and do not use Neon Auth.

## Development infrastructure

- API: `https://br-round-tree-b5lbzcui-api.compute.c-7.us-east-2.aws.neon.tech`
- Jobs: a separate Neon Function authenticated through native schedule-trigger provenance.
- Photos: private `uploads` bucket, accessed through the API gateway.
- Web preview: GitHub Pages at `https://erics1337.github.io/tribe`, built by the preview workflow.

The `api` and `jobs` functions use the same schema and storage branch. Sharp is deployed as an external native dependency. The schedule runs every minute; each run handles up to 20 due notification events and a bounded cleanup batch. Ordinary callers cannot invoke the jobs handler.

## Environment

Keep `.env.neon`, `.env`, `.env.local-development`, private signing keys and `.neon` out of Git. Never put database, storage or OAuth secrets in an `EXPO_PUBLIC_` variable. Only the API URL and web base path belong in the client build.

The API needs `DATABASE_URL`, `ENCRYPTION_KEY`, `PUBLIC_URL`, `WEB_URL` and `OAUTH_PRIVATE_JWK`. Production mode requires HTTPS, a confidential OAuth signing key and a private S3 bucket. Neon injects database and AWS storage variables into deployed functions. `ADMIN_DIDS` is a comma-separated staff allowlist and starts empty until a real staff account is deliberately configured.

`WEB_URL` identifies the exact web app callback base, including a base path if used. CORS permits its origin. Native callbacks use the fixed `tribe://auth-return` destination; incoming requests cannot supply an arbitrary redirect URI. The localhost OAuth variant uses a loopback IP redirect as required by the SDK.

## Deploy an isolated branch

```sh
neon link --project-id falling-mode-45952412 --no-env-pull --no-config -y
neon checkout dev-tribe-rebuild --no-env-pull
neon env pull --file .env.neon -s postgres -s object-storage
# Set stable application secrets and callback URLs in .env.neon.
node --env-file=.env.neon --import tsx packages/db/src/migrate.ts
neon config plan --env .env.neon
neon deploy --env .env.neon
```

Read the plan before applying it. Preserve the encryption and OAuth keys across deployments; changing the encryption key without migrating encrypted state breaks stored sessions. Do not run the environment initialization helper repeatedly to rotate signing keys. The helper preserves an existing private JWK, and contains this development branch’s known API URL rather than a universal production value.

The deploy command may also refresh `.env` with Neon values. Local development uses `.env.local-development` explicitly, and the seed refuses nonlocal database URLs.

## Release gates

Before inviting real beta networks:

1. All CI checks pass, including the complete browser sharing loop and negative authorization tests.
2. Complete real OAuth sign-in, renewal, cancellation, app restart, logout and PDS rediscovery on iOS and Android development builds. Test at least two account providers. Automated completion-code tests do not establish this live device result.
3. Create an EAS project; configure its project ID, signing credentials and physical-device push delivery. Test denied photo permission, interrupted uploads, large photos and voice accessibility.
4. Verify staff allowlist, report coverage, incident owner and the ability to take down a reported private post. Publish privacy and terms appropriate for the adults-only beta.
5. Review current cloud costs, public API rate limiting and edge abuse protection before broad public rollout. The in-process rate limiter is a per-isolate safeguard, not distributed ingress protection.
6. Perform the backup/restore drill and inventory API compatibility with already installed clients.

GitHub Pages is a browser preview. Shipping an iOS/Android app requires native build signing and store or internal distribution steps. This repository does not claim those steps have completed.
