import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import pool from "../../src/db/pool";

const LOCKED_THREAD_ID = "ea013741-d303-4910-ba47-8bcff24b9ba7";
const EXISTING_THREAD_ID = "880e8400-e29b-41d4-a716-446655440003";

const TEST_USER = {
  username: "posttestuser",
  email: "posttestuser@example.com",
  password: "password123",
};

describe("POST /api/posts", () => {
  let accessToken: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);
    const res = await request(app).post("/api/auth/login").send({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    accessToken = res.body.data.accessToken;
  });

  afterEach(async () => {
    // delete posts by author, then delete user
    await pool.query(
      `DELETE FROM posts WHERE author_id = (SELECT id FROM users WHERE email = $1)`,
      [TEST_USER.email],
    );
    await pool.query(`DELETE FROM users WHERE email = $1`, [TEST_USER.email]);
  });

  it("Should return 201 on valid request", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        thread_id: EXISTING_THREAD_ID,
        content: "Test post content",
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.content).toBe("Test post content");
  });

  it("Should return 400 if content is missing", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ thread_id: EXISTING_THREAD_ID });

    expect(res.status).toBe(400);
  });

  it("Should return 400 if thread_id is missing", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ content: "Test post content" });

    expect(res.status).toBe(400);
  });

  it("Should return 401 if no token is provided", async () => {
    const res = await request(app).post("/api/posts").send({
      thread_id: EXISTING_THREAD_ID,
      content: "Test post content",
    });

    expect(res.status).toBe(401);
  });

  it("Should return 403 if thread is locked", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        thread_id: LOCKED_THREAD_ID,
        content: "Test post content",
      });

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
  let authorToken: string;
  let adminToken: string;
  let otherToken: string;
  let postId: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(AUTHOR_USER);
    const authorLogin = await request(app).post("/api/auth/login").send({
      email: AUTHOR_USER.email,
      password: AUTHOR_USER.password,
    });
    authorToken = authorLogin.body.data.accessToken;

    await request(app).post("/api/auth/register").send(ADMIN_USER);
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [
      ADMIN_USER.email,
    ]);
    const adminLogin = await request(app).post("/api/auth/login").send({
      email: ADMIN_USER.email,
      password: ADMIN_USER.password,
    });
    adminToken = adminLogin.body.data.accessToken;

    await request(app).post("/api/auth/register").send(OTHER_USER);
    const otherLogin = await request(app).post("/api/auth/login").send({
      email: OTHER_USER.email,
      password: OTHER_USER.password,
    });
    otherToken = otherLogin.body.data.accessToken;

    const postRes = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${authorToken}`)
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
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ content: "Updated content" });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(postId);
    expect(res.body.data.content).toBe("Updated content");
  });

  it("Should return 200 with updated post when admin patches", async () => {
    const res = await request(app)
      .patch(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ content: "Admin updated content" });

    expect(res.status).toBe(200);
    expect(res.body.data.content).toBe("Admin updated content");
  });

  it("Should return 400 if content is missing", async () => {
    const res = await request(app)
      .patch(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${authorToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("Should return 401 if no token is provided", async () => {
    const res = await request(app)
      .patch(`/api/posts/${postId}`)
      .send({ content: "Updated content" });

    expect(res.status).toBe(401);
  });

  it("Should return 403 if user is not the author or admin", async () => {
    const res = await request(app)
      .patch(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ content: "Updated content" });

    expect(res.status).toBe(403);
  });

  it("Should return 404 if post does not exist", async () => {
    const res = await request(app)
      .patch(`/api/posts/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ content: "Updated content" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/posts/:id", () => {
  let authorToken: string;
  let adminToken: string;
  let otherToken: string;
  let postId: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(AUTHOR_USER);
    const authorLogin = await request(app).post("/api/auth/login").send({
      email: AUTHOR_USER.email,
      password: AUTHOR_USER.password,
    });
    authorToken = authorLogin.body.data.accessToken;

    await request(app).post("/api/auth/register").send(ADMIN_USER);
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [
      ADMIN_USER.email,
    ]);
    const adminLogin = await request(app).post("/api/auth/login").send({
      email: ADMIN_USER.email,
      password: ADMIN_USER.password,
    });
    adminToken = adminLogin.body.data.accessToken;

    await request(app).post("/api/auth/register").send(OTHER_USER);
    const otherLogin = await request(app).post("/api/auth/login").send({
      email: OTHER_USER.email,
      password: OTHER_USER.password,
    });
    otherToken = otherLogin.body.data.accessToken;

    const postRes = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ thread_id: EXISTING_THREAD_ID, content: "Post to be deleted" });
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
      .set("Authorization", `Bearer ${authorToken}`);

    expect(res.status).toBe(204);
  });

  it("Should return 204 when admin deletes any post", async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("Should return 401 if no token is provided", async () => {
    const res = await request(app).delete(`/api/posts/${postId}`);

    expect(res.status).toBe(401);
  });

  it("Should return 403 if user is not the author or admin", async () => {
    const res = await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it("Should return 404 if post does not exist", async () => {
    const res = await request(app)
      .delete(`/api/posts/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${authorToken}`);

    expect(res.status).toBe(404);
  });
});
