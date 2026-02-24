import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import pool from "../../src/db/pool";

describe("POST /api/categories", () => {
  let accessToken: string;

  const TEST_USER = {
    username: "categorytestuser",
    email: "categorytestuser@example.com",
    password: "password123",
  };

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);
    await pool.query(
      `UPDATE users 
        SET role = 'admin' 
        WHERE email= $1`,
      [TEST_USER.email],
    );
    const res = await request(app).post("/api/auth/login").send({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    accessToken = res.body.data.accessToken;
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM categories WHERE name = $1`, ["Test Category"],);
    await pool.query(`DELETE FROM users WHERE email = $1`, [TEST_USER.email]);
    await pool.query(`DELETE FROM users WHERE email = $1`, ["memberuser@example.com"]);
  });

  it("Should return 201 and create a new category", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Test Category",
        description: "A category for testing",
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.name).toBe("Test Category");
  });

  it("Should return 401 if no token is provided", async () => {
    const res = await request(app).post("/api/categories").send({
      name: "Test Category",
      description: "A category for testing",
    });

    expect(res.status).toBe(401);
  });

  it("Should return 403 if user is not admin", async () => {
    const MEMBER_TEST_USER = {
      username: "memberuser",
      email: "memberuser@example.com",
      password: "password123",
    };

    await request(app).post("/api/auth/register").send(MEMBER_TEST_USER);
    const resLogin = await request(app).post("/api/auth/login").send({
      email: MEMBER_TEST_USER.email,
      password: MEMBER_TEST_USER.password,
    });
    const memberAccessToken = resLogin.body.data.accessToken;

    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${memberAccessToken}`)
      .send({
        name: "Test Category",
        description: "A category for testing",
      });

    expect(res.status).toBe(403);
  });

  it("Should return 400 if name is missing", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        description: "No name provided",
      });

    expect(res.status).toBe(400);
  });
});
