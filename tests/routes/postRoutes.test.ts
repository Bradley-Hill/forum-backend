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
