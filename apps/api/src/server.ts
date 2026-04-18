import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import {
  acknowledgeNudgeSchema,
  createBlockSchema,
  createCommentSchema,
  createMuteSchema,
  createPostSchema,
  createReactionSchema,
  listFeedQuerySchema,
  moveMembershipSchema,
  profileUpdateSchema,
  sessionExchangeSchema,
  tierMembershipInputSchema,
} from "@tribe/shared";
import { env } from "./env";
import { createDatabaseClient } from "./db/client";
import { AppError } from "./lib/errors";
import { TribeRepository } from "./repositories/tribe-repository";
import { AtprotoDirectoryService } from "./services/atproto";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

export async function createServer() {
  const fastify = Fastify({ logger: false });
  const { db } = await createDatabaseClient();
  const atproto = new AtprotoDirectoryService(env);
  const repository = new TribeRepository(db, atproto);
  await repository.seedDemoData();

  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
  });

  fastify.decorate("repository", repository);
  fastify.decorateRequest("userId", "");

  fastify.addHook("preHandler", async (request, reply) => {
    if (request.url.startsWith("/auth/session") || request.url.startsWith("/health")) {
      return;
    }

    try {
      await request.jwtVerify();
      const jwtUser = request.user as { sub?: string };
      request.userId = String(jwtUser.sub);
    } catch {
      return reply.status(401).send({ message: "Authentication required." });
    }
  });

  fastify.get("/health", async () => ({ ok: true }));

  fastify.post("/auth/session", async (request) => {
    const payload = sessionExchangeSchema.parse(request.body);
    const user = await repository.upsertUser(payload);
    const token = await fastify.jwt.sign({
      sub: user.id,
      did: user.did,
    });
    const relationships = await repository.listMemberships(user.id);

    return {
      token,
      user,
      needsOnboarding: relationships.length === 0,
    };
  });

  fastify.get("/auth/me", async (request) => {
    const user = await repository.getUserById(request.userId);
    if (!user) {
      throw new AppError(404, "User not found.");
    }
    const relationships = await repository.listMemberships(user.id);
    return { user, needsOnboarding: relationships.length === 0 };
  });

  fastify.patch("/profile", async (request) => {
    const payload = profileUpdateSchema.parse(request.body);
    return repository.updateProfile(request.userId, payload);
  });

  fastify.get("/users/search", async (request) => {
    const query = typeof request.query === "object" && request.query ? String((request.query as Record<string, string>).q ?? "") : "";
    return repository.searchUsers(query, request.userId);
  });

  fastify.get("/relationships", async (request) => {
    return repository.listMemberships(request.userId);
  });

  fastify.post("/relationships", async (request) => {
    const payload = tierMembershipInputSchema.parse(request.body);
    return repository.createOrMoveMembership(request.userId, payload.memberId, payload.tier);
  });

  fastify.patch("/relationships/:membershipId", async (request) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const params = request.params as Record<string, string | undefined>;
    const payload = moveMembershipSchema.parse({
      ...body,
      membershipId: params.membershipId,
    });
    return repository.moveMembership(request.userId, payload.membershipId, payload.tier);
  });

  fastify.get("/feed", async (request) => {
    const payload = listFeedQuerySchema.parse(request.query);
    return repository.listFeed(request.userId, payload.tier, payload.cursor, payload.limit);
  });

  fastify.post("/posts", async (request) => {
    const payload = createPostSchema.parse(request.body);
    return repository.createPost(request.userId, payload);
  });

  fastify.post("/comments", async (request) => {
    const payload = createCommentSchema.parse(request.body);
    return repository.createComment(request.userId, payload.postId, payload.body);
  });

  fastify.post("/reactions", async (request) => {
    const payload = createReactionSchema.parse(request.body);
    return repository.createReaction(request.userId, payload.postId, payload.emoji);
  });

  fastify.delete("/reactions/:reactionId", async (request) => {
    const params = request.params as Record<string, string | undefined>;
    await repository.deleteReaction(request.userId, params.reactionId ?? "");
    return { ok: true };
  });

  fastify.post("/blocks", async (request) => {
    const payload = createBlockSchema.parse(request.body);
    return repository.createBlock(request.userId, payload.blockedUserId);
  });

  fastify.delete("/blocks/:blockedUserId", async (request) => {
    const params = request.params as Record<string, string | undefined>;
    await repository.deleteBlock(request.userId, params.blockedUserId ?? "");
    return { ok: true };
  });

  fastify.post("/mutes", async (request) => {
    const payload = createMuteSchema.parse(request.body);
    return repository.createMute(request.userId, payload.mutedUserId);
  });

  fastify.delete("/mutes/:mutedUserId", async (request) => {
    const params = request.params as Record<string, string | undefined>;
    await repository.deleteMute(request.userId, params.mutedUserId ?? "");
    return { ok: true };
  });

  fastify.get("/nudges", async (request) => {
    return repository.listNudges(request.userId);
  });

  fastify.post("/nudges/acknowledge", async (request) => {
    const payload = acknowledgeNudgeSchema.parse(request.body);
    return repository.acknowledgeNudge(request.userId, payload.nudgeId);
  });

  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    if (typeof error === "object" && error && "issues" in error) {
      return reply.status(400).send({ message: "Invalid request.", issues: (error as { issues: unknown }).issues });
    }

    const message = error instanceof Error ? error.message : "Internal server error.";
    return reply.status(500).send({ message });
  });

  return fastify;
}
