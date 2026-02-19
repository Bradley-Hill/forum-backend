import { describe, it, expect } from "vitest";
import { getPostsByThread } from "../../src/repositories/postRepository";

describe("getPostsByThreadId", () => {
  it("should return posts for a thread with correct structure", async () => {
    const result = await getPostsByThread(
      "550e8400-e29b-41d4-a716-446655440000",
      1,
      20,
    );

    expect(result.posts).toBeInstanceOf(Array);
    expect(result.posts.length).toBeGreaterThan(0);

    const post = result.posts[0];
    expect(post).toHaveProperty("id");
    expect(post).toHaveProperty("author");
    expect(post.author).toHaveProperty("id");
    expect(post.author).toHaveProperty("username");
    expect(post).toHaveProperty("content");
    expect(post).toHaveProperty("created_at");
    expect(post).toHaveProperty("updated_at");
    expect(post).toHaveProperty("thread_id");
    expect(result.totalCount).toBeGreaterThan(0);
    expect(typeof post.author).toBe("object");
  });

    it("should return empty array for thread with no posts", async () => {
    const result = await getPostsByThread(
      "00000000-0000-0000-0000-000000000001",
      1,
      20,
    );

    expect(result.posts).toBeInstanceOf(Array);
    expect(result.posts.length).toBe(0);
    expect(result.totalCount).toBe(0);
  });
});
