import { describe, it, expect, afterEach, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import pool from "../../src/db/pool";

const TEST_USER = {
  username: "testuser",
  email: "testuser@example.com",
  password: "password123",
};

describe("POST /api/auth/register", () => {
  afterEach(async () => {
    await pool.query(
      `DELETE FROM users
            WHERE email = $1`,
      [TEST_USER.email],
    );
  });
  it("Should register a new user and return 201", async () => {
    const res = await request(app).post("/api/auth/register").send(TEST_USER);

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.username).toBe(TEST_USER.username);
    expect(res.body.data.email).toBe(TEST_USER.email);
  });

  it("Should return 400 if fields are missing", async () => {
    const res = await request(app).post("/api/auth/register").send({
      username: "",
    });

    expect(res.status).toBe(400);
  });

  it("Should return 409 if username already exists", async () => {
    const res1 = await request(app).post("/api/auth/register").send(TEST_USER);

    expect(res1.status).toBe(201);

    const res2 = await request(app)
      .post("/api/auth/register")
      .send({
        ...TEST_USER,
        email: "anotheremail@example.com",
      });

    expect(res2.status).toBe(409);
  });

  it("Should return 409 if email already exists", async () => {
    const res1 = await request(app).post("/api/auth/register").send(TEST_USER);

    expect(res1.status).toBe(201);

    const res2 = await request(app)
      .post("/api/auth/register")
      .send({
        ...TEST_USER,
        email: "testuser@example.com",
        username: "anotherusername",
      });

    expect(res2.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);
  });

  afterEach(async () => {
    await pool.query(
      `DELETE FROM users
            WHERE email = $1`,
      [TEST_USER.email],
    );
  });

  it("Should return 200 with accesstoken and refreshtoken on valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("accessToken");
    expect(res.body.data).toHaveProperty("refreshToken");
  });

  it("Should return 400 if fields are missing", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "",
    });

    expect(res.status).toBe(400);
  });

  it("Should return 401 if email does not exist", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nonexistent@example.com",
      password: "password123",
    });

    expect(res.status).toBe(401);
  });

  it("Should return 401 if password is incorrect", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: TEST_USER.email,
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/refresh", () => {
  let refreshToken: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);

    const loginRes = await request(app).post("/api/auth/login").send({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    refreshToken = loginRes.body.data.refreshToken;
  });

  afterEach(async () => {
    await pool.query(
      `DELETE FROM users
                WHERE email = $1`,
      [TEST_USER.email],
    );
  });

  it("Should return 200 with new access token on valid refresh token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("accessToken");
  });

  it("Should return 400 if refresh token is missing", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});

    expect(res.status).toBe(400);
  });

  it("Should return 401 if refresh token is invalid", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "invalidtoken" });

    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  let refreshToken: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);

    const loginRes = await request(app).post("/api/auth/login").send({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    refreshToken = loginRes.body.data.refreshToken;
  });

  afterEach(async () => {
    await pool.query(
      `DELETE FROM users
                WHERE email = $1`,
      [TEST_USER.email],
    );
  });

  it("Should return 200 on valid refresh token", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken });

    expect(res.status).toBe(200);
  });

  it("Should return 400 if refresh token is missing", async () => {
    const res = await request(app).post("/api/auth/logout").send({});

    expect(res.status).toBe(400);
  });
});