import { defineConfig } from '@neon/config/v1';

export default defineConfig({
  auth: true,
  triggers: { 'tribe-jobs': { type: 'schedule', function: 'jobs', cron: '* * * * *' } },
  preview: {
    // Upgrade to a paid plan to enable AI Gateway for your project.
    // aiGateway: true,
    buckets: {
      uploads: { access: 'private' },
    },
    functions: {
      api: {
        name: 'Tribe API',
        source: './apps/api/src/neon.ts',
        externalPackages: ['sharp'],
        env: {
          NODE_ENV: 'production',
          PUBLIC_URL: process.env.PUBLIC_URL!,
          WEB_URL: process.env.WEB_URL!,
          ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
          OAUTH_PRIVATE_JWK: process.env.OAUTH_PRIVATE_JWK!,
          S3_BUCKET: 'uploads',
          ADMIN_DIDS: process.env.ADMIN_DIDS ?? '',
        },
      },
      jobs: {
        name: 'Tribe background jobs',
        source: './apps/api/src/neon-jobs.ts',
        externalPackages: ['sharp'],
        env: {
          NODE_ENV: 'production',
          PUBLIC_URL: process.env.PUBLIC_URL!,
          WEB_URL: process.env.WEB_URL!,
          ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
          OAUTH_PRIVATE_JWK: process.env.OAUTH_PRIVATE_JWK!,
          S3_BUCKET: 'uploads',
          ADMIN_DIDS: process.env.ADMIN_DIDS ?? '',
        },
      },
    },
  },
});
