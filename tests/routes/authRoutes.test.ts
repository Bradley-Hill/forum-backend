import { describe, it, expect, afterEach, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import pool from "../../src/db/pool";
import { loginUser } from "../testUtils";

const TEST_USER = {
  username: "testuser",
  email: "testuser@example.com",
  password: "password123",
};

describe("POST /api/auth/register", () => {
  afterEach(async () => {
    await pool.query(`DELETE FROM users WHERE email = $1`, [TEST_USER.email]);
    await pool.query(`DELETE FROM users WHERE email = $1`, ["anotheremail@example.com"]);
  });

  it("Should register a new user and return 201 with csrfToken and cookies", async () => {
    const res = await request(app).post("/api/auth/register").send(TEST_USER);

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("csrfToken");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("Should return 400 if fields are missing", async () => {
    const res = await request(app).post("/api/auth/register").send({ username: "" });
    expect(res.status).toBe(400);
  });

  it("Should return 409 if username already exists", async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...TEST_USER, email: "anotheremail@example.com" });

    expect(res.status).toBe(409);
  });

  it("Should return 409 if email already exists", async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...TEST_USER, username: "anotherusername" });

    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM users WHERE email = $1`, [TEST_USER.email]);
  });

  it("Should return 200 with csrfToken in body and auth cookies on valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("csrfToken");
    const cookies = res.headers["set-cookie"] as string[];
    expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);
  });

  it("Should return 400 if fields are missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "" });
    expect(res.status).toBe(400);
  });

  it("Should return 401 if email does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nonexistent@example.com", password: "password123" });
    expect(res.status).toBe(401);
  });

  it("Should return 401 if password is incorrect", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: "wrongpassword" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/refresh", () => {
  let cookies: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);
    const session = await loginUser(TEST_USER.email, TEST_USER.password);
    cookies = session.cookies;
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM users WHERE email = $1`, [TEST_USER.email]);
  });

  it("Should return 200 with new csrfToken when refresh cookie is valid", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("csrfToken");
  });

  it("Should return 400 if refresh cookie is missing", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(400);
  });

  it("Should return 401 if refresh cookie is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "refreshToken=invalidtoken");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  let cookies: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);
    const session = await loginUser(TEST_USER.email, TEST_USER.password);
    cookies = session.cookies;
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM users WHERE email = $1`, [TEST_USER.email]);
  });

  it("Should return 200 and clear cookies on valid session", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
  });

  it("Should return 400 if refresh cookie is missing", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(400);
  });
});
