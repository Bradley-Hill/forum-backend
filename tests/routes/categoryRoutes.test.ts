import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/app";
import pool from "../../src/db/pool";
import { loginUser } from "../testUtils";

describe("POST /api/categories", () => {
  let adminCookies: string;
  let adminCsrf: string;

  const TEST_USER = {
    username: "categorytestuser",
    email: "categorytestuser@example.com",
    password: "password123",
  };

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(TEST_USER);
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [TEST_USER.email]);
    ({ cookies: adminCookies, csrfToken: adminCsrf } = await loginUser(TEST_USER.email, TEST_USER.password));
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM categories WHERE name = $1`, ["Test Category"]);
    await pool.query(`DELETE FROM users WHERE email = $1`, [TEST_USER.email]);
    await pool.query(`DELETE FROM users WHERE email = $1`, ["memberuser@example.com"]);
  });

  it("Should return 201 and create a new category", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ name: "Test Category", description: "A category for testing" });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.name).toBe("Test Category");
  });

  it("Should return 401 if no auth cookies provided", async () => {
    const res = await request(app)
      .post("/api/categories")
      .send({ name: "Test Category", description: "A category for testing" });
    expect(res.status).toBe(401);
  });

  it("Should return 403 if CSRF token is missing", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Cookie", adminCookies)
      .send({ name: "Test Category", description: "A category for testing" });
    expect(res.status).toBe(403);
  });

  it("Should return 403 if user is not admin", async () => {
    const MEMBER_TEST_USER = {
      username: "memberuser",
      email: "memberuser@example.com",
      password: "password123",
    };
    await request(app).post("/api/auth/register").send(MEMBER_TEST_USER);
    const { cookies: memberCookies, csrfToken: memberCsrf } = await loginUser(
      MEMBER_TEST_USER.email,
      MEMBER_TEST_USER.password,
    );

    const res = await request(app)
      .post("/api/categories")
      .set("Cookie", memberCookies)
      .set("X-CSRF-Token", memberCsrf)
      .send({ name: "Test Category", description: "A category for testing" });

    expect(res.status).toBe(403);
  });

  it("Should return 400 if name is missing", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ description: "No name provided" });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/categories/:id", () => {
  let adminCookies: string;
  let adminCsrf: string;
  let memberCookies: string;
  let memberCsrf: string;
  let categoryId: string;

  const ADMIN_USER = {
    username: "deletecategoryadmin",
    email: "deletecategoryadmin@example.com",
    password: "password123",
  };

  const MEMBER_USER = {
    username: "deletecategorymember",
    email: "deletecategorymember@example.com",
    password: "password123",
  };

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(ADMIN_USER);
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [ADMIN_USER.email]);
    ({ cookies: adminCookies, csrfToken: adminCsrf } = await loginUser(ADMIN_USER.email, ADMIN_USER.password));

    await request(app).post("/api/auth/register").send(MEMBER_USER);
    ({ cookies: memberCookies, csrfToken: memberCsrf } = await loginUser(MEMBER_USER.email, MEMBER_USER.password));

    const catRes = await request(app)
      .post("/api/categories")
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ name: "Delete Me", description: "Temporary category" });
    categoryId = catRes.body.data.id;
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM categories WHERE id = $1`, [categoryId]);
    await pool.query(`DELETE FROM users WHERE email = $1`, [ADMIN_USER.email]);
    await pool.query(`DELETE FROM users WHERE email = $1`, [MEMBER_USER.email]);
  });

  it("Should return 204 when admin deletes a category", async () => {
    const res = await request(app)
      .delete(`/api/categories/${categoryId}`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf);
    expect(res.status).toBe(204);
  });

  it("Should return 401 if no auth cookies provided", async () => {
    const res = await request(app).delete(`/api/categories/${categoryId}`);
    expect(res.status).toBe(401);
  });

  it("Should return 403 if user is not an admin", async () => {
    const res = await request(app)
      .delete(`/api/categories/${categoryId}`)
      .set("Cookie", memberCookies)
      .set("X-CSRF-Token", memberCsrf);
    expect(res.status).toBe(403);
  });

  it("Should return 404 if category does not exist", async () => {
    const res = await request(app)
      .delete(`/api/categories/00000000-0000-0000-0000-000000000000`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/categories/:id", () => {
  let adminCookies: string;
  let adminCsrf: string;
  let memberCookies: string;
  let memberCsrf: string;
  let categoryId: string;

  const ADMIN_USER = {
    username: "updatecategoryadmin",
    email: "updatecategoryadmin@example.com",
    password: "password123",
  };

  const MEMBER_USER = {
    username: "updatecategorymember",
    email: "updatecategorymember@example.com",
    password: "password123",
  };

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(ADMIN_USER);
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [ADMIN_USER.email]);
    ({ cookies: adminCookies, csrfToken: adminCsrf } = await loginUser(ADMIN_USER.email, ADMIN_USER.password));

    await request(app).post("/api/auth/register").send(MEMBER_USER);
    ({ cookies: memberCookies, csrfToken: memberCsrf } = await loginUser(MEMBER_USER.email, MEMBER_USER.password));

    const catRes = await request(app)
      .post("/api/categories")
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ name: "Original Name", description: "Original description" });
    categoryId = catRes.body.data.id;
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM categories WHERE id = $1`, [categoryId]);
    await pool.query(`DELETE FROM users WHERE email = $1`, [ADMIN_USER.email]);
    await pool.query(`DELETE FROM users WHERE email = $1`, [MEMBER_USER.email]);
  });

  it("Should return 200 and update the category name and slug", async () => {
    const res = await request(app)
      .patch(`/api/categories/${categoryId}`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Name");
    expect(res.body.data.slug).toBe("updated-name");
  });

  it("Should return 200 and update only the description", async () => {
    const res = await request(app)
      .patch(`/api/categories/${categoryId}`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ description: "New description" });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe("New description");
    expect(res.body.data.name).toBe("Original Name");
  });

  it("Should return 400 if neither name nor description is provided", async () => {
    const res = await request(app)
      .patch(`/api/categories/${categoryId}`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({});
    expect(res.status).toBe(400);
  });

  it("Should return 400 if name is an empty string", async () => {
    const res = await request(app)
      .patch(`/api/categories/${categoryId}`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ name: "   " });
    expect(res.status).toBe(400);
  });

  it("Should return 401 if no auth cookies provided", async () => {
    const res = await request(app)
      .patch(`/api/categories/${categoryId}`)
      .send({ name: "Updated Name" });
    expect(res.status).toBe(401);
  });

  it("Should return 403 if user is not an admin", async () => {
    const res = await request(app)
      .patch(`/api/categories/${categoryId}`)
      .set("Cookie", memberCookies)
      .set("X-CSRF-Token", memberCsrf)
      .send({ name: "Updated Name" });
    expect(res.status).toBe(403);
  });

  it("Should return 404 if category does not exist", async () => {
    const res = await request(app)
      .patch(`/api/categories/00000000-0000-0000-0000-000000000000`)
      .set("Cookie", adminCookies)
      .set("X-CSRF-Token", adminCsrf)
      .send({ name: "Updated Name" });
    expect(res.status).toBe(404);
  });
});
