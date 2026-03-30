import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import pool from "../../src/db/pool";
import { loginUser } from "../testUtils";

const LOCKED_THREAD_ID = "ea013741-d303-4910-ba47-8bcff24b9ba7";
const EXISTING_THREAD_ID = "880e8400-e29b-41d4-a716-446655440003";

const TEST_USER = {
  username: "posttestuser",
  email: "posttestuser@example.com",
  password: "password123",
};

describe("POST /api/posts", () => {
  let cookies: string;
  let csrfToken: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);
    ({ cookies, csrfToken } = await loginUser(TEST_USER.email, TEST_USER.password));
  });

  afterEach(async () => {
    await pool.query(
      `DELETE FROM posts WHERE author_id = (SELECT id FROM users WHERE email = $1)`,
      [TEST_USER.email],
    );
    await pool.query(`DELETE FROM users WHERE email = $1`, [TEST_USER.email]);
  });

  it("Should return 201 with post on valid request", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrfToken)
      .send({ thread_id: EXISTING_THREAD_ID, content: "Test post content" });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.content).toBe("Test post content");
  });

  it("Should return 400 if content is missing", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrfToken)
      .send({ thread_id: EXISTING_THREAD_ID });
    expect(res.status).toBe(400);
  });

  it("Should return 400 if thread_id is missing", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrfToken)
      .send({ content: "Test post content" });
    expect(res.status).toBe(400);
  });

  it("Should return 400 if thread_id is invalid", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrfToken)
      .send({ thread_id: "not-a-uuid", content: "Test post content" });
    expect(res.status).toBe(400);
  });

  it("Should return 401 if no auth cookies provided", async () => {
    const res = await request(app)
      .post("/api/posts")
      .send({ thread_id: EXISTING_THREAD_ID, content: "Test post content" });
    expect(res.status).toBe(401);
  });

  it("Should return 403 if CSRF token is missing", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Cookie", cookies)
      .send({ thread_id: EXISTING_THREAD_ID, content: "Test post content" });
    expect(res.status).toBe(403);
  });

  it("Should return 403 if thread is locked", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrfToken)
      .send({ thread_id: LOCKED_THREAD_ID, content: "Test post content" });
    expect(res.status).toBe(403);
  });
});

const AUTHOR_USER = {
  username: "patch_post_author",
  email: "patch.post.author@example.com",
  password: "password123",
};

const ADMIN_USER = {
  username: "patch_post_admin",
  email: "patch.post.admin@example.com",
  password: "password123",
};

const OTHER_USER = {
  username: "patch_post_other",
  email: "patch.post.other@example.com",
  password: "password123",
};

describe("PATCH /api/posts/:id", () => {
  let authorCookies: string;
  let authorCsrf: string;
  let adminCookies: string;
  let adminCsrf: string;
  let otherCookies: string;
  let otherCsrf: string;
  let postId: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(AUTHOR_USER);
    ({ cookies: authorCookies, csrfToken: authorCsrf } = await loginUser(AUTHOR_USER.email, AUTHOR_USER.password));

    await request(app).post("/api/auth/register").send(ADMIN_USER);
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [ADMIN_USER.email]);
    ({ cookies: adminCookies, csrfToken: adminCsrf } = await loginUser(ADMIN_USER.email, ADMIN_USER.password));

    await request(app).post("/api/auth/register").send(OTHER_USER);
    ({ cookies: otherCookies, csrfToken: otherCsrf } = await loginUser(OTHER_USER.email, OTHER_USER.password));

    const postRes = await request(app)
      .post("/api/posts")
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({ thread_id: EXISTING_THREAD_ID, content: "Original content" });
    postId = postRes.body.data.id;
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM posts WHERE id = $1`, [postId]);
    await pool.query(`DELETE FROM users WHERE email = ANY($1)`, [
      [AUTHOR_USER.email, ADMIN_USER.email, OTHER_USER.email],
    ]);
  });

  it("Should return 200 with updated post when author patches", async () => {
    const res = await request(app)
      .patch(`/api/posts/${postId}`)
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({ content: "Updated content" });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(postId);
    expect(res.body.data.content).toBe("Updated content");
  });

  it("Should return 200 with updated post when admin patches", async () => {
    const res = await request(app)
      .patch(`/api/posts/${postId}`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ content: "Admin updated content" });

    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe("Admin updated content");
  });

  it("Should return 400 if content is missing", async () => {
    const res = await request(app)
      .patch(`/api/posts/${postId}`)
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({});
    expect(res.status).toBe(400);
  });

  it("Should return 401 if no auth cookies provided", async () => {
    const res = await request(app)
      .patch(`/api/posts/${postId}`)
      .send({ content: "Updated content" });
    expect(res.status).toBe(401);
  });

  it("Should return 403 if user is not the author or admin", async () => {
    const res = await request(app)
      .patch(`/api/posts/${postId}`)
      .set("Cookie", otherCookies)
      .set("X-CSRF-Token", otherCsrf)
      .send({ content: "Updated content" });
    expect(res.status).toBe(403);
  });

  it("Should return 404 if post does not exist", async () => {
    const res = await request(app)
      .patch(`/api/posts/00000000-0000-0000-0000-000000000000`)
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({ content: "Updated content" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/posts/:id", () => {
  let authorCookies: string;
  let authorCsrf: string;
  let adminCookies: string;
  let adminCsrf: string;
  let otherCookies: string;
  let otherCsrf: string;
  let postId: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(AUTHOR_USER);
    ({ cookies: authorCookies, csrfToken: authorCsrf } = await loginUser(AUTHOR_USER.email, AUTHOR_USER.password));

    await request(app).post("/api/auth/register").send(ADMIN_USER);
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [ADMIN_USER.email]);
    ({ cookies: adminCookies, csrfToken: adminCsrf } = await loginUser(ADMIN_USER.email, ADMIN_USER.password));

    await request(app).post("/api/auth/register").send(OTHER_USER);
    ({ cookies: otherCookies, csrfToken: otherCsrf } = await loginUser(OTHER_USER.email, OTHER_USER.password));

    const postRes = await request(app)
      .post("/api/posts")
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({ thread_id: EXISTING_THREAD_ID, content: "Post to delete" });
    postId = postRes.body.data.id;
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM posts WHERE id = $1`, [postId]);
    await pool.query(`DELETE FROM users WHERE email = ANY($1)`, [
      [AUTHOR_USER.email, ADMIN_USER.email, OTHER_USER.email],
    ]);
  });

  it("Should return 204 when author deletes their post", async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf);
    expect(res.status).toBe(204);
  });

  it("Should return 204 when admin deletes any post", async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf);
    expect(res.status).toBe(204);
  });

  it("Should return 401 if no auth cookies provided", async () => {
    const res = await request(app).delete(`/api/posts/${postId}`);
    expect(res.status).toBe(401);
  });

  it("Should return 403 if user is not the author or admin", async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Cookie", otherCookies)
      .set("X-CSRF-Token", otherCsrf);
    expect(res.status).toBe(403);
  });

  it("Should return 404 if post does not exist", async () => {
    const res = await request(app)
      .delete(`/api/posts/00000000-0000-0000-0000-000000000000`)
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf);
    expect(res.status).toBe(404);
  });
});
