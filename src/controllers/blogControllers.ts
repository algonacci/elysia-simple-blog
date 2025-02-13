import { Elysia, t } from "elysia"
import { db } from "../models/db"
import { nanoid } from "nanoid";
import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";

const VIEWS_PATH = import.meta.dir + "/../../public/views"

export const blogController = (app: Elysia) => {
    app.get("/", () => Bun.file(VIEWS_PATH + "/index.html"))

    app.get("/blogs", () => {
        const allBlogs = db.query("SELECT * FROM blog").all()
        return allBlogs
    })

    app.get("/blog/:id", ({ params }) => {
        const { id } = params
        const selectedBlog = db.query("SELECT * FROM blog WHERE id = (?)").all(id)
        return selectedBlog
    })

    app.get("/post", () => Bun.file(VIEWS_PATH + "/new.html"))

    app.post("/post", async ({ set, body, redirect }) => {
        set.status = 201
        const { title, content, thumbnail } = body

        try {
            const uploadsDir = "public/uploads"

            await mkdir(uploadsDir, { recursive: true });

            const originalFilename = thumbnail.name;
            const fileExtension = originalFilename.split('.').pop();
            const filenameWithoutExtension = originalFilename.replace(`.${fileExtension}`, '');
            const uniqueFilename = `${filenameWithoutExtension}-${nanoid()}.${fileExtension}`;
            const fullFilePath = join(uploadsDir, uniqueFilename);

            const buffer = await thumbnail.arrayBuffer();
            await Bun.write(fullFilePath, buffer);

            db.query(`INSERT INTO blog (title, content, thumbnail) VALUES (?, ?, ?)`).all(title, content, uniqueFilename)

            return redirect('/')

        } catch (error) {
            console.error("Error creating blog post:", error);
            set.status = 500;
            return { success: false, message: "Error creating blog post" };
        }

    }, {
        body: t.Object({
            title: t.String(),
            content: t.String(),
            thumbnail: t.File(),
        })
    })

    app.put("/post/:id", async ({ params, body, set }) => {
        const { id } = params;
        const { title, content, thumbnail } = body;

        try {
            const existingBlog = db.query("SELECT thumbnail FROM blog WHERE id = ?").get(id) as { thumbnail: string } | undefined;

            if (!existingBlog) {
                set.status = 404;
                return { success: false, message: "Blog post not found" };
            }

            let thumbnailFilename = existingBlog.thumbnail;
            const uploadsDir = "public/uploads";

            if (thumbnail && thumbnail.size > 0) {  // Check if a new thumbnail was actually uploaded
                // Delete the old thumbnail
                if (existingBlog.thumbnail) {
                    const oldFilePath = join(uploadsDir, existingBlog.thumbnail);
                    await unlink(oldFilePath).catch(err => console.error("Error deleting old thumbnail:", err));
                }

                // Save the new thumbnail
                const originalFilename = thumbnail.name;
                const fileExtension = originalFilename.split('.').pop();
                const filenameWithoutExtension = originalFilename.replace(`.${fileExtension}`, '');
                thumbnailFilename = `${filenameWithoutExtension}-${nanoid()}.${fileExtension}`;
                const fullFilePath = join(uploadsDir, thumbnailFilename);

                const buffer = await thumbnail.arrayBuffer();
                await Bun.write(fullFilePath, buffer);
            } else {
                // If no new thumbnail was uploaded, keep the existing one
                thumbnailFilename = existingBlog.thumbnail;
            }

            // Update the blog post in the database
            db.query(`UPDATE blog SET title = ?, content = ?, thumbnail = ? WHERE id = ?`).run(title, content, thumbnailFilename, id);

            set.status = 200;
            return { success: true, message: "Blog post updated successfully" };
        } catch (error) {
            console.error("Error updating blog post:", error);
            set.status = 500;
            return { success: false, message: "Error updating blog post" };
        }
    }, {
        body: t.Object({
            title: t.String(),
            content: t.String(),
            thumbnail: t.Optional(t.File()),
        })
    });

    app.get("/edit/:id", Bun.file(VIEWS_PATH + "/edit.html"))

    app.get("/read/:id", Bun.file(VIEWS_PATH + "/read.html"))

    app.delete("/delete/:id", async ({ params, set }) => {
        const { id } = params;
        const uploadsDir = "public/uploads";

        try {
            // First, get the thumbnail filename from the database
            const blog = db.query("SELECT thumbnail FROM blog WHERE id = ?").get(id) as { thumbnail: string } | undefined;

            if (!blog) {
                set.status = 404;
                return { success: false, message: "Blog post not found" };
            }

            // Delete the thumbnail file if it exists
            if (blog.thumbnail) {
                const thumbnailPath = join(uploadsDir, blog.thumbnail);
                await unlink(thumbnailPath).catch(err => console.error("Error deleting thumbnail file:", err));
            }

            // Delete the blog post from the database
            db.query("DELETE FROM blog WHERE id = ?").run(id);

            set.status = 200;
            return { success: true, message: "Blog post and associated thumbnail deleted successfully" };
        } catch (error) {
            console.error("Error deleting blog post:", error);
            set.status = 500;
            return { success: false, message: "Error deleting blog post" };
        }
    });


    return app
}