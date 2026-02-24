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
