import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import pool from "../../src/db/pool";

const EXISTING_CATEGORY_ID = "e3d20b4f-cd76-4e19-9b05-eb2ee7e76a29";

const TEST_USER = {
  username: "threadtestuser",
  email: "threadtestuser@example.com",
  password: "password123",
};

describe("POST /api/threads", () => {
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
    await pool.query(
      `DELETE FROM threads WHERE author_id = (SELECT id FROM users WHERE email = $1)`,
      [TEST_USER.email],
    );
    await pool.query(`DELETE FROM users WHERE email = $1`, [TEST_USER.email]);
  });

  it("Should return 201 with thread on valid request", async () => {
    const res = await request(app)
      .post("/api/threads")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        category_id: EXISTING_CATEGORY_ID,
        title: "Test Thread",
        content: "Test content",
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.title).toBe("Test Thread");
  });

  it("Should return 400 if title is missing", async () => {
    const res = await request(app)
      .post("/api/threads")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        category_id: EXISTING_CATEGORY_ID,
        content: "Test content",
      });

    expect(res.status).toBe(400);
  });

  it("Should return 400 if content is missing", async () => {
    const res = await request(app)
      .post("/api/threads")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        category_id: EXISTING_CATEGORY_ID,
        title: "Test Thread",
      });

    expect(res.status).toBe(400);
  });

  it("Should return 401 if no token is provided", async () => {
    const res = await request(app).post("/api/threads").send({
      category_id: EXISTING_CATEGORY_ID,
      title: "Test Thread",
      content: "Test content",
    });

    expect(res.status).toBe(401);
  });

  it("Should return 401 if token is invalid", async () => {
    const res = await request(app)
      .post("/api/threads")
      .set("Authorization", `Bearer invalidtoken`)
      .send({
        category_id: EXISTING_CATEGORY_ID,
        title: "Test Thread",
        content: "Test content",
      });

    expect(res.status).toBe(401);
  });

  it("Should return 400 if category_id is missing", async () => {
    const res = await request(app)
      .post("/api/threads")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "Test Thread",
        content: "Test content",
      });

    expect(res.status).toBe(400);
  });

  it("Should return 500 if category_id is invalid", async () => {
    const res = await request(app)
      .post("/api/threads")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        category_id: "invalid-category-id",
        title: "Test Thread",
        content: "Test content",
      });

    expect(res.status).toBe(500);
  });
});

const AUTHOR_USER = {
  username: "patch_thread_author",
  email: "patch.thread.author@example.com",
  password: "password123",
};

const ADMIN_USER = {
  username: "patch_thread_admin",
  email: "patch.thread.admin@example.com",
  password: "password123",
};

const OTHER_USER = {
  username: "patch_thread_other",
  email: "patch.thread.other@example.com",
  password: "password123",
};

describe("PATCH /api/threads/:id", () => {
  let authorToken: string;
  let adminToken: string;
  let otherToken: string;
  let threadId: string;

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

    const threadRes = await request(app)
      .post("/api/threads")
      .set("Authorization", `Bearer ${authorToken}`)
      .send({
        category_id: EXISTING_CATEGORY_ID,
        title: "Original Title",
        content: "Thread content",
      });
    threadId = threadRes.body.data.id;
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM threads WHERE id = $1`, [threadId]);
    await pool.query(`DELETE FROM users WHERE email = ANY($1)`, [
      [AUTHOR_USER.email, ADMIN_USER.email, OTHER_USER.email],
    ]);
  });

  it("Should return 200 with updated thread when author patches", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}`)
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(threadId);
    expect(res.body.data.title).toBe("Updated Title");
  });

  it("Should return 200 with updated thread when admin patches", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "Admin Updated Title" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Admin Updated Title");
  });

  it("Should return 400 if title is missing", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}`)
      .set("Authorization", `Bearer ${authorToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("Should return 401 if no token is provided", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}`)
      .send({ title: "Updated Title" });

    expect(res.status).toBe(401);
  });

  it("Should return 403 if user is not the author or admin", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Updated Title" });

    expect(res.status).toBe(403);
  });

  it("Should return 404 if thread does not exist", async () => {
    const res = await request(app)
      .patch(`/api/threads/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${authorToken}`)
      .send({ title: "Updated Title" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/threads/:id", () => {
  let authorToken: string;
  let adminToken: string;
  let otherToken: string;
  let threadId: string;

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

    const threadRes = await request(app)
      .post("/api/threads")
      .set("Authorization", `Bearer ${authorToken}`)
      .send({
        category_id: EXISTING_CATEGORY_ID,
        title: "Thread to be deleted",
        content: "Thread content",
      });
    threadId = threadRes.body.data.id;
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM threads WHERE id = $1`, [threadId]);
    await pool.query(`DELETE FROM users WHERE email = ANY($1)`, [
      [AUTHOR_USER.email, ADMIN_USER.email, OTHER_USER.email],
    ]);
  });

  it("Should return 204 when author deletes their thread", async () => {
    const res = await request(app)
      .delete(`/api/threads/${threadId}`)
      .set("Authorization", `Bearer ${authorToken}`);

    expect(res.status).toBe(204);
  });

  it("Should return 204 when admin deletes any thread", async () => {
    const res = await request(app)
      .delete(`/api/threads/${threadId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("Should return 401 if no token is provided", async () => {
    const res = await request(app).delete(`/api/threads/${threadId}`);

    expect(res.status).toBe(401);
  });

  it("Should return 403 if user is not the author or admin", async () => {
    const res = await request(app)
      .delete(`/api/threads/${threadId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it("Should return 404 if thread does not exist", async () => {
    const res = await request(app)
      .delete(`/api/threads/00000000-0000-0000-0000-000000000000`)
      .set("Authorization", `Bearer ${authorToken}`);

    expect(res.status).toBe(404);
  });
});
