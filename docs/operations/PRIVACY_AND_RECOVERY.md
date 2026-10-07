# Tribe privacy, incidents and recovery

## Access rules

A viewer must be an active account. The post must be active and authored by an active account. The viewer must be its author or have an unrevoked grant, and there must be no block in either direction. Feed filters and mutes can reduce visible items; neither grants access.

Circle assignments are owner-only. Publish previews contain the owner’s eligible recipient names. Recipient post responses omit the tier, preview version and roster. Comments can reveal other authorized participants. No private content is written to an AT repository or public media blob.

Removing a connection revokes the author’s old grants to that DID. Blocking removes assignments in both directions, revokes grants and adds a dynamic denial. Moving a person does not rewrite past grants. Re-adding cannot restore a revoked grant. Public AT content remains public outside Tribe, regardless of Tribe blocks.

## Retention and deletion

Deleting a post denies future access immediately. Its media is removed after a 24-hour grace period by the worker. Unattached uploads older than 24 hours are removed. Deleting an account denies access immediately, removes local session credentials and circle assignments, clears profile identity into an internal tombstone, deletes recipient grants, and makes its media eligible for the next cleanup batch. AT identity and public AT records are untouched.

Closed moderation reports retain restricted evidence for up to 90 days; open reports remain for review. Staff report access and takedowns are audited. Received posts and other people’s private assignments are excluded from export. Export includes the user's own moments, photos, assignments and authored replies; it is not an export of their entire friends’ network.

Deletion cannot erase copies retained by recipients or instantly remove records from backups. Database recovery history and storage retention must be confirmed against the chosen Neon plan. Do not claim a longer recovery window than configured. Backups and restored environments are private and must not bypass current deletion/revocation decisions.

## Operational privacy

Server logs omit private payloads, credentials, callback query strings and request bodies. Push payloads contain only a generic notice and an Activity destination. Delivery checks post access and actor blocks again. Analytics are not connected to a third-party provider in this build.

OAuth encrypted state requires a separately managed 256-bit encryption key. OAuth signing keys and storage/database credentials remain server-only. Treat development session JSON and browser test traces as secrets; both are ignored by Git.

## Incident handling

For an unauthorized private access incident, stop invitations and publishing, preserve restricted diagnostic evidence, identify affected posts and accounts, revoke relevant sessions/grants, and fix the policy before reopening. Rotate credentials if exposure warrants it. Contact affected beta users using the approved incident process. Do not send notifications from a development environment to production devices.

## Recovery

Keep the legacy code tag and branch. Rollback of code is separate from database recovery and mobile-client compatibility. Prefer additive schema changes until the rollout is stable.

For a recovery drill, create an isolated restore database or Neon branch, restore a backup, and verify user/post/grant relations plus their private object keys. Verify that an authorized recipient can fetch the restored media and an outsider cannot. Ensure the required encryption key restores OAuth state, and reapply subsequent deletion/revocation decisions before accepting traffic.

A database-only dump does not restore an external object store. Neon branchable storage can preserve branch-consistent database and object state; confirm the specific restore mechanism and retention on the account. Protect backups and synthetic preview data from public download.

A proposed beta objective is recovery within four hours with no more than one hour of lost committed data, contingent on configured backup coverage and a measured drill. It is a planning target rather than a demonstrated cloud recovery SLA.
