import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import pool from "../../src/db/pool";
import { loginUser } from "../testUtils";

const EXISTING_CATEGORY_ID = "e3d20b4f-cd76-4e19-9b05-eb2ee7e76a29";

const TEST_USER = {
  username: "threadtestuser",
  email: "threadtestuser@example.com",
  password: "password123",
};

describe("POST /api/threads", () => {
  let cookies: string;
  let csrfToken: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);
    ({ cookies, csrfToken } = await loginUser(TEST_USER.email, TEST_USER.password));
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
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrfToken)
      .send({ category_id: EXISTING_CATEGORY_ID, title: "Test Thread", content: "Test content" });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.title).toBe("Test Thread");
  });

  it("Should return 400 if title is missing", async () => {
    const res = await request(app)
      .post("/api/threads")
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrfToken)
      .send({ category_id: EXISTING_CATEGORY_ID, content: "Test content" });
    expect(res.status).toBe(400);
  });

  it("Should return 400 if content is missing", async () => {
    const res = await request(app)
      .post("/api/threads")
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrfToken)
      .send({ category_id: EXISTING_CATEGORY_ID, title: "Test Thread" });
    expect(res.status).toBe(400);
  });

  it("Should return 401 if no auth cookies provided", async () => {
    const res = await request(app)
      .post("/api/threads")
      .send({ category_id: EXISTING_CATEGORY_ID, title: "Test Thread", content: "Test content" });
    expect(res.status).toBe(401);
  });

  it("Should return 403 if CSRF token is missing", async () => {
    const res = await request(app)
      .post("/api/threads")
      .set("Cookie", cookies)
      .send({ category_id: EXISTING_CATEGORY_ID, title: "Test Thread", content: "Test content" });
    expect(res.status).toBe(403);
  });

  it("Should return 400 if category_id is missing", async () => {
    const res = await request(app)
      .post("/api/threads")
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrfToken)
      .send({ title: "Test Thread", content: "Test content" });
    expect(res.status).toBe(400);
  });

  it("Should return 400 if category_id is invalid", async () => {
    const res = await request(app)
      .post("/api/threads")
      .set("Cookie", cookies)
      .set("X-CSRF-Token", csrfToken)
      .send({ category_id: "invalid-category-id", title: "Test Thread", content: "Test content" });
    expect(res.status).toBe(400);
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
  let authorCookies: string;
  let authorCsrf: string;
  let adminCookies: string;
  let adminCsrf: string;
  let otherCookies: string;
  let otherCsrf: string;
  let threadId: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(AUTHOR_USER);
    ({ cookies: authorCookies, csrfToken: authorCsrf } = await loginUser(AUTHOR_USER.email, AUTHOR_USER.password));

    await request(app).post("/api/auth/register").send(ADMIN_USER);
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [ADMIN_USER.email]);
    ({ cookies: adminCookies, csrfToken: adminCsrf } = await loginUser(ADMIN_USER.email, ADMIN_USER.password));

    await request(app).post("/api/auth/register").send(OTHER_USER);
    ({ cookies: otherCookies, csrfToken: otherCsrf } = await loginUser(OTHER_USER.email, OTHER_USER.password));

    const threadRes = await request(app)
      .post("/api/threads")
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({ category_id: EXISTING_CATEGORY_ID, title: "Original Title", content: "Thread content" });
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
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(threadId);
    expect(res.body.data.title).toBe("Updated Title");
  });

  it("Should return 200 with updated thread when admin patches", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ title: "Admin Updated Title" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Admin Updated Title");
  });

  it("Should return 400 if title is missing", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}`)
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({});
    expect(res.status).toBe(400);
  });

  it("Should return 401 if no auth cookies provided", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}`)
      .send({ title: "Updated Title" });
    expect(res.status).toBe(401);
  });

  it("Should return 403 if user is not the author or admin", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}`)
      .set("Cookie", otherCookies)
      .set("X-CSRF-Token", otherCsrf)
      .send({ title: "Updated Title" });
    expect(res.status).toBe(403);
  });

  it("Should return 404 if thread does not exist", async () => {
    const res = await request(app)
      .patch(`/api/threads/00000000-0000-0000-0000-000000000000`)
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({ title: "Updated Title" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/threads/:id", () => {
  let authorCookies: string;
  let authorCsrf: string;
  let adminCookies: string;
  let adminCsrf: string;
  let otherCookies: string;
  let otherCsrf: string;
  let threadId: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(AUTHOR_USER);
    ({ cookies: authorCookies, csrfToken: authorCsrf } = await loginUser(AUTHOR_USER.email, AUTHOR_USER.password));

    await request(app).post("/api/auth/register").send(ADMIN_USER);
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [ADMIN_USER.email]);
    ({ cookies: adminCookies, csrfToken: adminCsrf } = await loginUser(ADMIN_USER.email, ADMIN_USER.password));

    await request(app).post("/api/auth/register").send(OTHER_USER);
    ({ cookies: otherCookies, csrfToken: otherCsrf } = await loginUser(OTHER_USER.email, OTHER_USER.password));

    const threadRes = await request(app)
      .post("/api/threads")
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({ category_id: EXISTING_CATEGORY_ID, title: "Thread to delete", content: "Thread content" });
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
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf);
    expect(res.status).toBe(204);
  });

  it("Should return 204 when admin deletes any thread", async () => {
    const res = await request(app)
      .delete(`/api/threads/${threadId}`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf);
    expect(res.status).toBe(204);
  });

  it("Should return 401 if no auth cookies provided", async () => {
    const res = await request(app).delete(`/api/threads/${threadId}`);
    expect(res.status).toBe(401);
  });

  it("Should return 403 if user is not the author or admin", async () => {
    const res = await request(app)
      .delete(`/api/threads/${threadId}`)
      .set("Cookie", otherCookies)
      .set("X-CSRF-Token", otherCsrf);
    expect(res.status).toBe(403);
  });

  it("Should return 404 if thread does not exist", async () => {
    const res = await request(app)
      .delete(`/api/threads/00000000-0000-0000-0000-000000000000`)
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/threads/:id/lock", () => {
  let authorCookies: string;
  let authorCsrf: string;
  let adminCookies: string;
  let adminCsrf: string;
  let otherCookies: string;
  let otherCsrf: string;
  let threadId: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(AUTHOR_USER);
    ({ cookies: authorCookies, csrfToken: authorCsrf } = await loginUser(AUTHOR_USER.email, AUTHOR_USER.password));

    await request(app).post("/api/auth/register").send(ADMIN_USER);
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [ADMIN_USER.email]);
    ({ cookies: adminCookies, csrfToken: adminCsrf } = await loginUser(ADMIN_USER.email, ADMIN_USER.password));

    await request(app).post("/api/auth/register").send(OTHER_USER);
    ({ cookies: otherCookies, csrfToken: otherCsrf } = await loginUser(OTHER_USER.email, OTHER_USER.password));

    const threadRes = await request(app)
      .post("/api/threads")
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({ category_id: EXISTING_CATEGORY_ID, title: "Thread to lock", content: "Thread content" });
    threadId = threadRes.body.data.id;
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM threads WHERE id = $1`, [threadId]);
    await pool.query(`DELETE FROM users WHERE email = ANY($1)`, [
      [AUTHOR_USER.email, ADMIN_USER.email, OTHER_USER.email],
    ]);
  });

  it("Should return 200 and lock the thread", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}/lock`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ is_locked: true });
    expect(res.status).toBe(200);
    expect(res.body.data.is_locked).toBe(true);
  });

  it("Should return 200 and unlock the thread", async () => {
    await request(app)
      .patch(`/api/threads/${threadId}/lock`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ is_locked: true });

    const res = await request(app)
      .patch(`/api/threads/${threadId}/lock`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ is_locked: false });
    expect(res.status).toBe(200);
    expect(res.body.data.is_locked).toBe(false);
  });

  it("Should return 400 if is_locked is not a boolean", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}/lock`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ is_locked: "yes" });
    expect(res.status).toBe(400);
  });

  it("Should return 401 if no auth cookies provided", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}/lock`)
      .send({ is_locked: true });
    expect(res.status).toBe(401);
  });

  it("Should return 403 if user is not an admin", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}/lock`)
      .set("Cookie", otherCookies)
      .set("X-CSRF-Token", otherCsrf)
      .send({ is_locked: true });
    expect(res.status).toBe(403);
  });

  it("Should return 403 if user is the author but not admin", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}/lock`)
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({ is_locked: true });
    expect(res.status).toBe(403);
  });

  it("Should return 404 if thread does not exist", async () => {
    const res = await request(app)
      .patch(`/api/threads/00000000-0000-0000-0000-000000000000/lock`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ is_locked: true });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/threads/:id/sticky", () => {
  let authorCookies: string;
  let authorCsrf: string;
  let adminCookies: string;
  let adminCsrf: string;
  let otherCookies: string;
  let otherCsrf: string;
  let threadId: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(AUTHOR_USER);
    ({ cookies: authorCookies, csrfToken: authorCsrf } = await loginUser(AUTHOR_USER.email, AUTHOR_USER.password));

    await request(app).post("/api/auth/register").send(ADMIN_USER);
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [ADMIN_USER.email]);
    ({ cookies: adminCookies, csrfToken: adminCsrf } = await loginUser(ADMIN_USER.email, ADMIN_USER.password));

    await request(app).post("/api/auth/register").send(OTHER_USER);
    ({ cookies: otherCookies, csrfToken: otherCsrf } = await loginUser(OTHER_USER.email, OTHER_USER.password));

    const threadRes = await request(app)
      .post("/api/threads")
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({ category_id: EXISTING_CATEGORY_ID, title: "Thread to sticky", content: "Thread content" });
    threadId = threadRes.body.data.id;
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM threads WHERE id = $1`, [threadId]);
    await pool.query(`DELETE FROM users WHERE email = ANY($1)`, [
      [AUTHOR_USER.email, ADMIN_USER.email, OTHER_USER.email],
    ]);
  });

  it("Should return 200 and sticky the thread", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}/sticky`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ is_sticky: true });
    expect(res.status).toBe(200);
    expect(res.body.data.is_sticky).toBe(true);
  });

  it("Should return 200 and un-sticky the thread", async () => {
    await request(app)
      .patch(`/api/threads/${threadId}/sticky`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ is_sticky: true });

    const res = await request(app)
      .patch(`/api/threads/${threadId}/sticky`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ is_sticky: false });
    expect(res.status).toBe(200);
    expect(res.body.data.is_sticky).toBe(false);
  });

  it("Should return 400 if is_sticky is not a boolean", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}/sticky`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ is_sticky: "yes" });
    expect(res.status).toBe(400);
  });

  it("Should return 401 if no auth cookies provided", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}/sticky`)
      .send({ is_sticky: true });
    expect(res.status).toBe(401);
  });

  it("Should return 403 if user is not an admin", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}/sticky`)
      .set("Cookie", otherCookies)
      .set("X-CSRF-Token", otherCsrf)
      .send({ is_sticky: true });
    expect(res.status).toBe(403);
  });

  it("Should return 403 if user is the author but not admin", async () => {
    const res = await request(app)
      .patch(`/api/threads/${threadId}/sticky`)
      .set("Cookie", authorCookies)
      .set("X-CSRF-Token", authorCsrf)
      .send({ is_sticky: true });
    expect(res.status).toBe(403);
  });

  it("Should return 404 if thread does not exist", async () => {
    const res = await request(app)
      .patch(`/api/threads/00000000-0000-0000-0000-000000000000/sticky`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ is_sticky: true });
    expect(res.status).toBe(404);
  });
});
