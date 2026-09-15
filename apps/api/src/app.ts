import Fastify, { type FastifyInstance } from "fastify";

export function createApp(): FastifyInstance {
  const app = Fastify();

  app.get("/api/v1/health", async () => ({ status: "ok" }));

  return app;
}
