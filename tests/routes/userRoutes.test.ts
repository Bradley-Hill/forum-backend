import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import pool from "../../src/db/pool";

const TEST_USER = {
  username: "profileuser",
  email: "profileuser@example.com",
  password: "password123",
};

describe("GET /api/users/:username", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM users WHERE email = $1`, [TEST_USER.email]);
  });

  it("Should return 200 and public profile", async () => {
    const res = await request(app).get(`/api/users/${TEST_USER.username}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.username).toBe(TEST_USER.username);
    expect(res.body.data).not.toHaveProperty("email");
    expect(res.body.data).not.toHaveProperty("password_hash");
  });

  it("Should return 404 if user does not exist", async () => {
    const res = await request(app).get("/api/users/nonexistentuser");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/users/me", () => {
  let accessToken: string;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);
    const loginRes = await request(app).post("/api/auth/login").send({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    accessToken = loginRes.body.data.accessToken;
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM users WHERE email = $1`, [TEST_USER.email]);
    await pool.query(`DELETE FROM users WHERE email = $1`, ["newemail@example.com"]);
  });

  it("Should update email", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "newemail@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("newemail@example.com");
  });

  it("Should update password with correct currentPassword", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: TEST_USER.password, newPassword: "newpass123" });

    expect(res.status).toBe(200);

    const loginRes = await request(app).post("/api/auth/login").send({
      email: TEST_USER.email,
      password: "newpass123",
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data).toHaveProperty("accessToken");
  });

  it("Should return 400 if neither email nor newPassword provided", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("Should return 400 if currentPassword missing when changing password", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ newPassword: "newpass123" });
    expect(res.status).toBe(400);
  });

  it("Should return 401 if currentPassword is wrong", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: "wrongpassword", newPassword: "newpass123" });
    expect(res.status).toBe(401);
  });

  it("Should return 409 if new email is already taken", async () => {
    await request(app).post("/api/auth/register").send({
      username: "otheruser",
      email: "newemail@example.com",
      password: "password123",
    });

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: "newemail@example.com" });

    expect(res.status).toBe(409);
  });

  it("Should return 401 if no token is provided", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .send({ email: "newemail@example.com" });
    expect(res.status).toBe(401);
  });
});