#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_APP_NAME = "Tribe";
const DEFAULT_SCOPE = "atproto repo:* rpc:*?aud=did:web:api.bsky.app#bsky_appview";
const DEFAULT_CALLBACK_PATH = "/auth/callback";

function parseArgs(argv) {
  const args = { host: "", appName: DEFAULT_APP_NAME, outDir: "dist/atproto-oauth-site" };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--host") {
      args.host = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (value === "--name") {
      args.appName = argv[index + 1] ?? DEFAULT_APP_NAME;
      index += 1;
      continue;
    }
    if (value === "--out-dir") {
      args.outDir = argv[index + 1] ?? args.outDir;
      index += 1;
      continue;
    }
  }

  return args;
}

function normalizeHost(rawHost) {
  const value = rawHost.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  if (!value) {
    throw new Error("Missing host. Example: pnpm atproto:prepare-pages -- --host tribepreview.pages.dev");
  }

  const labels = value.split(".");
  if (labels.length < 2 || labels.some((label) => !/^[a-z0-9-]+$/.test(label) || label.startsWith("-") || label.endsWith("-"))) {
    throw new Error(`Invalid host: ${rawHost}`);
  }

  return value;
}

function deriveScheme(host) {
  return host.split(".").reverse().join(".");
}

function renderMetadata({ host, appName, redirectUri }) {
  return JSON.stringify(
    {
      client_id: `https://${host}/oauth-client-metadata.json`,
      client_name: appName,
      client_uri: `https://${host}`,
      redirect_uris: [redirectUri],
      scope: DEFAULT_SCOPE,
      token_endpoint_auth_method: "none",
      response_types: ["code"],
      grant_types: ["authorization_code", "refresh_token"],
      application_type: "native",
      dpop_bound_access_tokens: true,
    },
    null,
    2,
  );
}

function renderIndex({ host }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tribe AT Protocol OAuth</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #1d2236;
        --muted: #5c657d;
        --paper: #f7f1e8;
        --line: #d7cfbf;
        --accent: #d3643b;
      }
      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        background: radial-gradient(circle at top, #fff5e6 0%, var(--paper) 55%, #efe5d8 100%);
        color: var(--ink);
      }
      main {
        max-width: 640px;
        margin: 0 auto;
        padding: 56px 24px 72px;
      }
      h1 {
        font-size: 42px;
        line-height: 1.05;
        margin: 0 0 16px;
      }
      p {
        color: var(--muted);
        font-size: 18px;
        line-height: 1.6;
      }
      a {
        color: var(--accent);
      }
      .panel {
        margin-top: 28px;
        padding: 18px 20px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.75);
      }
      code {
        font-family: "SFMono-Regular", ui-monospace, Menlo, monospace;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Tribe AT Protocol OAuth</h1>
      <p>This site hosts the public OAuth client metadata used by the Tribe mobile development build.</p>
      <div class="panel">
        <p><strong>Metadata URL</strong><br /><a href="/oauth-client-metadata.json">https://${host}/oauth-client-metadata.json</a></p>
        <p><strong>Host</strong><br /><code>${host}</code></p>
      </div>
    </main>
  </body>
</html>
`;
}

function renderEnvSnippet({ host, redirectUri }) {
  return `EXPO_PUBLIC_ATPROTO_CLIENT_ID=https://${host}/oauth-client-metadata.json
EXPO_PUBLIC_ATPROTO_CLIENT_URI=https://${host}
EXPO_PUBLIC_ATPROTO_REDIRECT_URI=${redirectUri}
`;
}

async function main() {
  const { host: rawHost, appName, outDir } = parseArgs(process.argv.slice(2));
  const host = normalizeHost(rawHost);
  const scheme = deriveScheme(host);
  const redirectUri = `${scheme}:${DEFAULT_CALLBACK_PATH}`;
  const outputDirectory = path.resolve(process.cwd(), outDir);

  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(path.join(outputDirectory, "oauth-client-metadata.json"), renderMetadata({ host, appName, redirectUri }));
  await fs.writeFile(path.join(outputDirectory, "index.html"), renderIndex({ host }));
  await fs.writeFile(path.join(outputDirectory, "mobile-oauth.env"), renderEnvSnippet({ host, redirectUri }));

  process.stdout.write(`Prepared AT Protocol OAuth site in ${outputDirectory}

Deploy that folder to a static HTTPS host using this exact hostname:
  https://${host}

Then copy these values into apps/mobile/.env and rebuild the native iOS app:
${renderEnvSnippet({ host, redirectUri })}
`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
