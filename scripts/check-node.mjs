const REQUIRED = [20, 19, 4];

function parseVersion(raw) {
  return raw.replace(/^v/, "").split(".").map((part) => Number.parseInt(part, 10));
}

function compareVersions(current, required) {
  for (let index = 0; index < required.length; index += 1) {
    const currentPart = current[index] ?? 0;
    const requiredPart = required[index] ?? 0;

    if (currentPart > requiredPart) {
      return 1;
    }

    if (currentPart < requiredPart) {
      return -1;
    }
  }

  return 0;
}

const current = parseVersion(process.version);

if (compareVersions(current, REQUIRED) < 0) {
  const requiredLabel = REQUIRED.join(".");
  console.error(
    [
      `Node.js ${process.version} is too old for this workspace.`,
      `Use Node.js ${requiredLabel} or newer before running Expo or the API.`,
      "If you use nvm: nvm install 20.19.4 && nvm use 20.19.4",
    ].join("\n"),
  );
  process.exit(1);
}
