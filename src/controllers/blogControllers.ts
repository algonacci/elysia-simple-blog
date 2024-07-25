import { Elysia, t } from "elysia"

const VIEWS_PATH = import.meta.dir + "/../../public/views"


export const blogController = (app: Elysia) => {
    app.get("/", () => Bun.file(VIEWS_PATH + "/index.html"))

    return app
}