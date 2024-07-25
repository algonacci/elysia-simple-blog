import Elysia from "elysia"
import { blogController } from "./blogControllers"

export const controllers = new Elysia()
    .use(blogController)