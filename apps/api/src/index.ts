import { createServer } from "./server";
import { env } from "./env";

const server = await createServer();

await server.listen({
  host: env.API_HOST,
  port: env.API_PORT,
});
