# Tribe PRD

**Product Requirements Document**  
**Version:** 2.0  
**Date:** March 15, 2026  
**Status:** Draft  
**Product:** Tribe

## 1. Executive Summary

**Tribe** is a mobile-first social product built around the idea that human relationships have natural limits. Instead of rewarding endless accumulation of followers, content, and noise, Tribe helps people intentionally organize and experience their real social world.

The core product uses relationship tiers inspired by Dunbar-style social group sizes. Users place people into meaningful circles with explicit limits, then choose how and where they share. The result is a calmer, more human social experience centered on closeness, context, and reciprocity rather than scale, virality, and algorithmic engagement.

Tribe is designed for people who feel alienated by traditional social apps but still want lightweight, visual, ambient connection with the people who matter most.

## 2. Product Vision

### Vision
Build a social app that treats attention, intimacy, and social capacity as finite and worth protecting.

### Product Promise
Tribe helps users:
- focus on the people they actually care about
- share with the right level of intimacy
- reduce social overload
- maintain healthier, more intentional digital relationships

### Core Principles
- **Finite by design:** limits are product features, not bugs
- **Relationship-aware:** audience and context matter
- **Portable and user-owned:** identity and graph should not be trapped in a single platform
- **Low-noise by default:** no endless feeds, no engagement bait, no growth hacking mechanics
- **Honest social UX:** the app should reflect real social dynamics, not flatten everyone into the same “friend” bucket

## 3. Problem Statement

Current social platforms optimize for volume, reach, and time spent. That creates a few recurring problems:

- users maintain far more weak ties than they can meaningfully engage with
- close relationships get buried under casual or performative posting
- audience collapse makes sharing feel awkward or emotionally risky
- users lose trust in feeds shaped by opaque algorithms
- “friend” and “follower” models do not reflect real human social structure

There is an opportunity to build a social experience that feels smaller, safer, and more intentional without feeling empty or overly restrictive.

## 4. Target Users

### Primary Audience
People in their 20s to 40s who are socially online but emotionally fatigued by mainstream platforms.

### Early Adopter Profiles
1. **Socially overloaded professionals**  
   They want connection without a firehose of content.

2. **Thoughtful sharers**  
   They like posting photos, life updates, and voice notes, but want tighter audience control.

3. **Community-oriented users**  
   They care about real relationships and small groups more than public reach.

4. **Ex-social-power-users**  
   People who are tired of Instagram, TikTok, X, or Facebook but still want a living social layer.

### User Needs
- “Show me posts from people I genuinely care about.”
- “Let me share differently with different circles.”
- “Help me keep my network sane.”
- “Do not reward me for posting to everyone all the time.”
- “Let me leave or move my identity without losing everything.”

## 5. Product Goals

### Primary Goals
- Create a distinctly calmer and more intentional social experience
- Increase the quality of interaction over quantity of interaction
- Make audience selection intuitive and habitual
- Prove that explicit relationship tiers can improve user satisfaction and retention

### Secondary Goals
- Establish a differentiated position within the AT Protocol ecosystem
- Enable portability of graph, identity, and content
- Create a foundation for privacy-respecting social tools and community extensions

### Non-Goals for MVP
- Becoming a general-purpose creator platform
- Competing on public discovery or viral growth
- Supporting large-scale influencer monetization
- Replacing every existing messaging or social app on day one

## 6. Product Concept

Tribe organizes a user’s social world into bounded relationship layers. Each layer has a capacity limit and a distinct sharing context.

### Relationship Tiers
- **Inner Circle:** up to 5 people  
- **Close:** up to 15 people  
- **Tribe:** up to 50 people  
- **Village:** up to 150 people  

Users can view separate feeds by tier and choose the audience for each post. The app nudges users to maintain a realistic graph and periodically review inactive or drifting relationships.

This model gives users:
- a more accurate social map
- better audience control
- lower feed volume
- more meaningful defaults for sharing

## 7. MVP Scope

## 7.1 Account and Identity
Users can:
- sign up and authenticate using AT Protocol-compatible identity
- create a profile with display name, avatar, and short bio
- import or connect existing AT-based identity if applicable

### Requirements
- support DID-based identity model
- provide secure key management with clear recovery flows
- keep onboarding understandable for non-technical users

## 7.2 Onboarding and Social Graph Setup
Users begin with empty tiers and are guided to populate them intentionally.

### Functional Requirements
- create and manage tier assignments
- add people through search, contacts, suggestions, or manual entry
- move people between tiers
- enforce tier caps
- show remaining capacity per tier
- support a review step before finalizing initial graph

### UX Requirements
- onboarding should explain why limits exist
- limits should feel thoughtful, not punitive
- users should understand that tiers are adjustable over time

## 7.3 Feeds
MVP includes separate feeds by relationship tier.

### Feed Types
- Inner Circle
- Close
- Tribe
- Village

### Feed Rules
- chronological ordering only
- no infinite scroll
- limited session depth, such as pagination or natural stopping points
- clear context about why each post is visible

### Content Types for MVP
- text posts
- photos
- short captions
- lightweight reactions
- comments

### Stretch, if feasible
- voice notes
- ephemeral posts for Inner Circle

## 7.4 Posting and Audience Selection
Users choose a sharing audience when creating a post.

### Requirements
- composer supports tier-specific posting
- default audience is explicit, never hidden
- users can preview who will see a post
- audience options include:
  - Inner Circle
  - Close
  - Tribe
  - Village
  - Broadcast

### Broadcast Constraints
Broadcast exists in MVP only if simple enough to implement. It should be intentionally limited and visually distinct from normal sharing. The product should discourage overuse rather than optimize it.

## 7.5 Relationship Health Nudges
The app should help users maintain a coherent social graph.

### MVP Nudge Systems
- **Capacity alerts:** notify users when a tier is nearly full
- **Inactivity review:** suggest reviewing relationships with no meaningful interaction after a defined period
- **Tier review prompts:** periodically ask whether a person still belongs in the same circle

### Design Rule
Nudges should feel reflective and helpful, not shaming or manipulative.

## 7.6 Privacy Controls
Users need confidence that tiered sharing actually means something.

### MVP Privacy Features
- control who can see each post based on selected audience
- block and mute users
- hide posts from specific users if needed
- basic content reporting and abuse escalation
- clear explanation of what is public, semi-private, and private

## 7.7 AT Protocol Integration
Tribe should use AT Protocol where it provides strategic value while avoiding unnecessary technical complexity in the first release.

### MVP Requirements
- account identity compatible with AT Protocol
- user content and graph stored in a portable, standards-aligned way where practical
- support future migration between providers
- ensure architecture allows interoperability with broader ecosystem over time

### Not Required for MVP
- full plugin ecosystem
- complex federation features exposed directly in product
- advanced third-party custom feeds at launch

## 8. Future Features

These are promising but should not block MVP.

### 8.1 Mirror Mode
An opt-in feature that lets users understand roughly how reciprocal a relationship is. This should be handled carefully because it can create emotional harm if presented bluntly.

### 8.2 Social Debt or Broadcast Budget
A mechanism that limits high-volume broad sharing and encourages selectivity.

### 8.3 Quiet Modes and Content Filters
Users define personal content boundaries such as politics, conflict, or event spam.

### 8.4 Ephemeral Inner Circle Content
Private stories, quick voice notes, or temporary check-ins for closest ties.

### 8.5 Group Utilities
Small group albums, event planning, polls, and ritual-based social prompts.

### 8.6 Tier Analytics
Private, user-facing insights such as:
- who they engage with most
- which tiers are overloaded
- whether their graph is stable over time

## 9. User Experience Principles

### Calm by Default
The app should feel finite, breathable, and emotionally safe.

### Clear Social Context
Every major action should make audience and relationship context obvious.

### Friction in the Right Places
Adding, broadcasting, or overfilling a tier can have intentional friction. Reading, replying, and staying connected should feel easy.

### No Shame
The product can be honest without being cruel. Tone matters.

### Portable Trust
Users should feel that their identity and relationships belong to them, not the app.

## 10. Functional Requirements Summary

### Must Have for MVP
- user authentication and profile setup
- tier creation and management with hard caps
- searchable user graph and adding people to tiers
- tier-based feeds
- post composer with audience selection
- chronological feed ranking
- comments and lightweight reactions
- block and mute controls
- inactivity and capacity nudges
- foundational AT Protocol-compatible architecture

### Nice to Have for MVP
- contact import
- voice notes
- ephemeral content
- shared albums
- group polls
- limited broadcast budgeting

## 11. Success Metrics

### Core Product Metrics
- percentage of users who complete tier setup during onboarding
- average number of users placed into at least two tiers within first 7 days
- weekly active users who post or interact within Inner Circle or Close
- average feed session length compared to post-session satisfaction
- retention at day 7, day 30, and day 90

### Quality Metrics
- percentage of posts shared to non-broadcast audiences
- average comments or reactions per post within close tiers
- frequency of tier adjustments over time
- percentage of users who report better signal-to-noise than on mainstream social apps

### Guardrail Metrics
- user complaints about confusing privacy boundaries
- churn caused by feeling overly constrained
- abuse, harassment, or trust incidents
- onboarding drop-off caused by too much graph setup friction

## 12. Technical Considerations

### Proposed Stack
- **Client:** React Native
- **Backend / Protocol Layer:** AT Protocol SDK and related services
- **Identity:** DID-based authentication and account portability model
- **Storage:** protocol-aligned user data repositories plus media storage strategy appropriate for privacy and performance
- **Analytics:** privacy-preserving product analytics with minimal collection

### Technical Priorities
- secure identity and recovery
- audience enforcement and privacy correctness
- portable data model for tiers and posts
- low-latency feed rendering
- simple architecture for early iteration

### Open Technical Questions
- how tier metadata should be represented in a protocol-compatible way
- what content can be fully portable versus app-specific
- best approach for private or encrypted content within protocol constraints
- whether media should be stored directly in protocol-linked storage or a hybrid architecture

## 13. Risks and Mitigations

### Risk: Users reject hard limits
**Mitigation:** position limits as a benefit, teach the model clearly, and let users reassign people easily without social drama.

### Risk: Users feel judged by tiering people
**Mitigation:** emphasize that tiers are private, flexible, and for user clarity, not public ranking.

### Risk: Privacy expectations are misunderstood
**Mitigation:** make audience selection and visibility states extremely explicit throughout the product.

### Risk: AT Protocol complexity slows delivery
**Mitigation:** keep interoperability goals strong but narrow MVP scope to what can be built reliably.

### Risk: Product feels too small or empty
**Mitigation:** optimize for warmth and relevance, not volume. Ensure initial onboarding quickly creates a living feed.

### Risk: Emotional harm from reciprocity features like Mirror Mode
**Mitigation:** keep such features out of MVP or make them strictly opt-in with careful wording.

## 14. Rollout Plan

### Phase 1: Product Definition
- finalize user flows
- design social tier model
- define data model and privacy rules
- prototype onboarding and posting UX

### Phase 2: MVP Build
- authentication and identity
- tier management
- posting and feeds
- privacy controls
- core nudges

### Phase 3: Closed Beta
- recruit a small cohort of intentional early adopters
- observe onboarding success and social graph behavior
- test whether limits feel empowering or annoying
- validate trust in audience controls

### Phase 4: Public Launch
- launch with strong product narrative around calmer social connection
- target users disillusioned with mainstream feeds
- position Tribe as a relationship-first network, not another content app

## 15. Positioning

### One-Line Positioning
A relationship-first social app built around real human capacity.

### Category Framing
Tribe is not “anti-social media.” It is pro-context, pro-intimacy, and pro-signal.

### Differentiators
- explicit relationship tiers with meaningful limits
- bounded feeds instead of endless consumption
- audience-aware sharing as a first-class feature
- portability and protocol-aligned identity
- a product philosophy centered on human capacity rather than growth at all costs

## 16. Open Questions

- Should Broadcast exist in MVP or wait until the core tier model proves itself?
- Are tier names best kept as fixed defaults, or should users rename them?
- Should users be able to follow people outside their managed tiers in a read-only way?
- How much friction is useful when demoting or removing someone?
- What is the right balance between private intimacy and interoperability?
- Which features best create delight without undermining the core discipline of the product?

## 17. Final Summary

Tribe has a strong and differentiated idea at its core: social software should reflect the actual limits of human attention and closeness. The product opportunity is not to help users scale their network endlessly, but to help them experience their relationships more clearly and with less noise.

The MVP should stay focused. The winning first version is not the most radical or the most feature-rich. It is the one that makes tiered social connection feel intuitive, calming, trustworthy, and worth coming back to.
