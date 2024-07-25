import { Elysia } from "elysia";
import { html } from "@elysiajs/html";
import staticPlugin from "@elysiajs/static";
import { logger } from "./helpers/logger";
import { controllers } from "./controllers";

const app = new Elysia()
  .use(html())
  .use(staticPlugin({
    prefix: "/"
  }))
  .use(controllers)

try {
  app.listen(3000)
} catch (e) {
  logger.error("[MAIN] Error starting server", e)
  process.exit(1)
}
logger.info(
  `[MAIN] Service is running at http://${app.server?.hostname}:${app.server?.port}`,
)