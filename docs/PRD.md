# Tribe product requirements

Draft for founder review · October 7, 2026

Tribe is a photo-centered social app that helps people share with and pay attention to the relationships they choose to maintain. Its core loop is simple: choose your people, share a moment with an explicit audience, and catch up in a finite feed. The first release uses Expo for iOS and Android, Neon Postgres for application data, and AT Protocol for account identity and a connection to the wider public network.

The product bet is that intentional limits and trustworthy audience controls create a more satisfying experience than accumulating connections. That is a hypothesis to validate with real friendship networks. Circle membership is managed by users; algorithmic suggestions come later.

## Product foundations

### Research and the product hypothesis

Dunbar's research on online friendship networks suggests that online tools do not simply remove constraints on maintaining close relationships. A 2021 reanalysis challenges deriving a precise human group limit from comparative brain data. The research informs the design, but does not establish that every person has a fixed neurological ceiling of 150 relationships or that restricting an app improves wellbeing. See [Dunbar 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4736918/) and [Lindenfors, Wartel and Lind 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8103230/).

Use 5, 15, 50 and 150 as initial product capacities inspired by this work. Explain them as an aid to intentional attention, not a diagnosis, friendship quota, or scientifically optimal allocation. A person with two close friends should feel as welcome as someone with a full circle. Evaluate whether limits help users before expanding the product around them.

### Who the first release serves

The initial cohort is adults who already have a few people they want to stay connected with and find mainstream social feeds noisy or performative. Recruit existing friend groups and families, with initial recruitment through people comfortable using an AT Protocol account. This is a launch wedge rather than the eventual market.

The most important jobs are:

- Share ordinary photos without broadcasting them to everyone.
- Catch up with close people without sorting through an unlimited feed.
- Organize relationships privately, without telling someone how they rank.
- Keep the option to participate in the public network without making personal sharing public.

### Principles

- The user decides who belongs where.
- Audience privacy is a server-enforced promise.
- Reading and sharing should be easy; expanding an audience should be deliberate.
- No public friendship rankings, follower scoreboards, streaks, or pressure to fill circles.
- Portable identity and exportable private data are distinct promises.
- Success is satisfying connection, not time spent scrolling.

## Circle model

Circles are personal, directional, and nested. Each person has one closest assigned tier. Wider circles include the smaller ones.

| Circle  | Maximum total people included | Includes                 |
| ------- | ----------------------------: | ------------------------ |
| Inner   |                             5 | People assigned to Inner |
| Close   |                            15 | Inner and Close          |
| Tribe   |                            50 | Inner, Close and Tribe   |
| Village |                           150 | All four tiers           |

With every circle full, the additional people at each layer are 5, 10, 35 and 100. There are at most 150 distinct managed connections, not 220. The owner does not count against capacity. Never require users to fill any circle.

Assignments are private to their owner. Alice can put Bob in Inner while Bob puts Alice in Village or nowhere. Adding someone does not reveal their tier or create a mutual friendship. Recipients see who shared a post, but never the author's tier name, audience count, or recipient roster. People may still infer shared access from comments; the UI must not promise anonymity between participants.

Capacity is checked atomically on the server across all affected circles. Adding a sixth Inner person fails; adding an Inner person when Close already includes 15 also fails. A move between existing tiers never adds a distinct Village connection, but can exceed an intermediate cap. Show which circle is full and let the user choose a reassignment. Never remove someone automatically.

Public AT follows may remain unlimited, but they do not automatically become Tribe connections. They belong to a separate public-network experience. Pending external connections consume capacity because they represent people the user has chosen to maintain.

## Visibility and sharing rules

### Two different kinds of social content

Private Tribe posts live in Tribe's backend and are visible only to authorized Tribe accounts. Public AT content can be discovered outside Tribe. A filtered public feed does not make its underlying posts private. The AT Protocol team's published guidance recommends keeping private application data on an application's own server while using AT for identity and public data. See [Protocol Check-in, private data section](https://atproto.com/blog/protocol-check-in-fall-2025).

The closed beta composer creates private posts only. A separate Network surface can show public profiles and public posts. Publishing public posts is a later, explicitly enabled feature with its own confirmation. Never use “Broadcast” to mean both a private Village audience and an internet-public post.

### Audience snapshots and revocation

At publish time, the server calculates and stores the eligible recipient DIDs for the selected nested circle. The owner previews the actual recipient list before posting; the server commits the post and snapshot together. If the preview becomes stale, reconfirm rather than silently expanding the audience.

- Adding a person later never reveals older posts.
- Moving a recipient between tiers preserves their existing post access, because those posts were already shared with them.
- Removing a connection revokes that person's access to the author's historical private posts. Confirmation describes this consequence. Re-adding does not restore revoked grants.
- Blocking in either direction denies private post access and interaction in both directions. Unblocking does not restore revoked grants or removed assignments.
- Post deletion denies further access to the post, its comments, reactions and media.
- New members do not get private posts created before they joined Tribe. A pending external DID becomes eligible for future posts after registration; it receives no historical backfill.

Check authorization on every feed, detail, comment, reaction, notification and media request. Recheck permission when queued work runs. Revocation prevents future server access; it cannot erase downloaded files, screenshots or copies kept by recipients. MVP privacy is access control with encryption in transit and at rest, not end-to-end encryption.

Private posts cannot be made public by editing an audience. Future public sharing creates a separate publication after an explicit review, without exporting private comments, reactions or audience information.

## Closed beta scope

| Area             | Required behavior                                                                      | Acceptance criteria                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Identity         | Sign in using an existing AT account; preserve DID identity through handle changes     | Backend verifies OAuth account ownership; session renewal, logout and revoked credentials behave correctly   |
| Onboarding       | Explain private circles, add people by handle or invite, choose initial tier           | User can skip setup, start with one connection, and see a useful empty state                                 |
| Relationships    | Add, move and remove people; show nested capacity; distinguish people who have joined  | Concurrent changes cannot exceed caps; another account cannot fetch assignments                              |
| Sharing          | Text or a photo carousel of up to four images, caption, alt text and recipient preview | Stale previews require confirmation; retries do not duplicate a post; draft remains after failure            |
| Feed             | Chronological private feed with circle filters and an end to the current catch-up      | Only permitted posts appear; stable pagination; clear empty, loading and failure states                      |
| Interaction      | Comments and one lightweight reaction per person per post                              | Post authorization applies to every interaction; participants can delete their own comments                  |
| Safety           | Block, mute, report; basic staff review and takedown tools                             | Blocked users lose access; reports are actionable; administrative access is restricted and audited           |
| Notifications    | Opt-in replies and reactions, optional digest, quiet hours                             | No private body or tier in push payload; permission checked before delivery and on open                      |
| Public network   | Public profile search and optional public posts from selected people                   | Public content is labeled; no public result includes private Tribe data                                      |
| Account controls | Export, delete account, manage sessions and notification preferences                   | Export excludes others' private tier assignments; deletion removes credentials and denies access immediately |

Proposed content limits: 2,000 caption characters, 1,000 comment characters and 10 MB per uploaded image before processing. Validate these through mobile performance testing. Strip location metadata, verify file type and dimensions, and generate private thumbnails. Videos, stories and voice notes are later work.

### Feed semantics

Feed filters use the viewer's current circle assignments to select authors, then enforce each post's grants. A user cannot view a private post merely because they placed its author in Inner. Their access depends on what that author shared with them. The All view includes permitted incoming private posts even from authors the viewer has not assigned, excluding muted or blocked accounts.

Start each catch-up with a fixed time watermark. Show pages of 20 posts through an explicit “Load earlier” action; distinguish “caught up since your last visit” from the rest of the history. New posts appear after refresh rather than continually extending the session. Public Network is a separate tab and never silently fills an empty private feed.

### Primary journeys

1. **Join and connect:** sign in, understand the private/public distinction, find two or three people, assign circles, share an invite link with someone who has not joined.
2. **Share a moment:** pick photos, write a caption, choose a circle, review names, publish, receive a clear success or recoverable error.
3. **Catch up:** see the latest authorized moments, filter to Close, reply, reach the catch-up stopping point.
4. **Review a relationship:** inspect capacity, move a person without notifying them, or remove them after understanding historical access revocation.
5. **Handle unwanted contact:** mute for attention control, block for access denial, or report for staff review. Muting does not revoke anyone's access.

Proposed navigation: Home, Circles, Compose, Activity and Profile, with Network reachable as a separate surface. Test whether Network deserves a primary tab before committing to six destinations.

### Cold start and invitations

AT identity avoids requiring a new identity, but does not create an active private network. Public follows become optional suggestions, never automatic tier assignments. Invite complete small networks, not disconnected individuals. Users share invite links themselves; Tribe sends no unsolicited AT messages and uploads no phone address book in MVP.

Invitation links are unguessable, expire, and grant no post access. Acceptance establishes account identity and gives the inviting user a prompt to review a connection; it never assigns a tier automatically. Avoid fake activity, synthetic friends and demo content in real accounts.

### Deliberately deferred

- AI relationship classification, automatic moves and inferred intimacy scores.
- “Mirror” features revealing how someone else ranks you.
- Direct messages, stories, video, livestreaming and large group administration.
- Custom circle sizes and labels until the fixed model is tested.
- Phone contacts import, full-network indexing and bidirectional public synchronization.
- Public publishing until private audience controls and moderation work reliably.
- Paid plans, ads, creator monetization and engagement-based recommendation feeds.

AI can later offer an opt-in, explainable suggestion such as reviewing a circle assignment. Every change requires user action. Offline closeness cannot be inferred from app activity alone. Do not analyze private post text for relationship scoring or train models on it by default. First establish whether manual management causes enough friction to justify this feature.

## Validation and success criteria

Recruit 5–10 existing networks of roughly 5–15 adults for a four-to-six-week beta. Interview members before launch and after weeks two and four. Small samples guide product decisions; they do not establish causal health benefits.

The primary outcome is the share of activated users who report at least one satisfying connection through Tribe during the week, alongside a survey on calmness, audience confidence and overall usefulness. Comments and reactions provide supporting behavior, not a substitute for relationship quality.

Proposed planning thresholds, to revise after the first cohort:

| Measure                        | Initial target                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Activation within seven days   | 60% of invited sign-ins assign at least three people, encounter a reciprocal private interaction, and return on another day |
| Weekly connection satisfaction | 70% of responding activated users report a satisfying connection                                                            |
| Audience comprehension         | 90% correctly predict recipients and the public/private distinction in usability tasks                                      |
| Week-four retention            | 40% of activated users return in week four                                                                                  |
| Capacity friction              | Fewer than 20% report that circle limits prevented a desired relationship without a workable adjustment                     |
| Unauthorized private access    | Zero known incidents; any incident stops expansion pending remediation                                                      |

Report denominators, survey response rates and results by invited network. Track onboarding abandonment, unwanted contact, report handling time and people feeling ranked or excluded. Do not optimize session duration, streaks or total follow count.

Analytics use minimal events such as setup completed, audience preview confirmed, publish succeeded and catch-up completed. Exclude captions, comments, recipient lists and tier memberships from third-party analytics. Keep operational logs free of OAuth credentials and private payloads.

## Quality and launch requirements

- VoiceOver and TalkBack support, dynamic type, sufficient contrast, large touch targets and meaningful image descriptions.
- Local drafts and retry support; no offline publishing that bypasses a current audience check.
- Proposed beta targets: 99.5% monthly API availability, 99.5% crash-free sessions, and p95 private feed API latency under 500 ms at a measured 100 concurrent users, excluding media transfers. These are targets, not measured performance.
- Permission revocation takes effect on the next server request. Private media uses an authorized delivery path; logout and revocation purge client caches where possible.
- Before launch, define incident ownership, reporting coverage, deletion schedules, backup retention and recovery objectives, then test recovery.
- Account deletion is distinct from deleting the person's AT account. Tribe must never delete public identity or public records as an implicit side effect.
- Initial beta is adults only. Review expansion requirements before onboarding minors.

## Decisions proposed for review

The implementation can proceed with nested hard capacities, private directional assignments, snapshot sharing, removal-based historical revocation, an existing-AT-account beta and a separate public Network surface. These defaults resolve ambiguity without claiming that the science dictates each choice.

Before expanding beyond beta, decide whether strict caps help enough to keep them, whether nontechnical users need assisted AT account creation, and whether public publishing improves the experience. Any promise of automatic private-data migration between providers requires additional work beyond AT identity portability.
