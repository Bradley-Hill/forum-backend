import request from "supertest";
import app from "../src/app";

export interface TestSession {
  cookies: string;
  csrfToken: string;
}

export async function loginUser(email: string, password: string): Promise<TestSession> {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  const setCookieHeader = res.headers["set-cookie"] as string[] | string | undefined;
  const rawCookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];

  const cookies = rawCookies.map((c) => c.split(";")[0]).join("; ");
  const csrfToken = res.body.data?.csrfToken as string;

  return { cookies, csrfToken };
}
