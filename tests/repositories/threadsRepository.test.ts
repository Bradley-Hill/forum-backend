import { describe, it, expect } from "vitest";
import {
  getThreadsByCategory,
  getThreadById,
} from "../../src/repositories/threadRepository";

describe("threadRepository", () => {
  it("should return threads for a category with correct structure", async () => {
    const result = await getThreadsByCategory(
      "e3d20b4f-cd76-4e19-9b05-eb2ee7e76a29",
      1,
      20,
    );

    expect(result.threads).toBeInstanceOf(Array);
    expect(result.threads.length).toBeGreaterThan(0);

    const thread = result.threads[0];
    expect(thread).toHaveProperty("id");
    expect(thread).toHaveProperty("author");
    expect(thread.author).toHaveProperty("id");
    expect(thread.author).toHaveProperty("username");
    expect(thread).toHaveProperty("title");
    expect(thread).toHaveProperty("is_sticky");
    expect(thread).toHaveProperty("is_locked");
    expect(thread).toHaveProperty("created_at");
    expect(thread).toHaveProperty("updated_at");
    expect(thread).toHaveProperty("category_id");
    expect(thread).toHaveProperty("reply_count");
    expect(result.totalCount).toBeGreaterThan(0);
    expect(typeof thread.reply_count).toBe("number");
    expect(typeof thread.author).toBe("object");
  });
});

describe("getThreadById", () => {
  it("should return a thread with correct structure", async () => {
    const threadId = "880e8400-e29b-41d4-a716-446655440003";
    const thread = await getThreadById(threadId);

    expect(thread).not.toBeNull();
    if (thread) {
      expect(thread).toHaveProperty("id", threadId);
      expect(thread).toHaveProperty("author");
      expect(thread.author).toHaveProperty("id");
      expect(thread.author).toHaveProperty("username");
      expect(thread).toHaveProperty("title");
      expect(thread).toHaveProperty("is_sticky");
      expect(thread).toHaveProperty("is_locked");
      expect(thread).toHaveProperty("created_at");
      expect(thread).toHaveProperty("updated_at");
      expect(thread).toHaveProperty("category_id");
      expect(thread).toHaveProperty("reply_count");
      expect(typeof thread.reply_count).toBe("number");
      expect(typeof thread.author).toBe("object");
    }
  });

  it("should return null for non-existent thread", async () => {
    const threadId = "00000000-0000-0000-0000-000000000000";
    const thread = await getThreadById(threadId);
    expect(thread).toBeNull();
  });
});
