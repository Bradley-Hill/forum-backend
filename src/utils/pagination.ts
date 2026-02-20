import { PaginationResult } from "../types/pagination";

const PAGE_DEFAULT = 1;
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

export function validatePaginationParams(
  rawPage: unknown,
  rawPageSize: unknown,
): PaginationResult {
  const page = rawPage !== undefined ? Number(rawPage) : PAGE_DEFAULT;
  const pageSize =
    rawPageSize !== undefined ? Number(rawPageSize) : PAGE_SIZE_DEFAULT;

  if (!Number.isInteger(page) || page < 1) {
    return {
      valid: false,
      error: {
        message: "Invalid pagination: page must be a positive integer",
        code: "INVALID_PAGINATION",
      },
    };
  }

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > PAGE_SIZE_MAX) {
    return {
      valid: false,
      error: {
        message: `Invalid pagination: pageSize must be a positive integer between 1 and ${PAGE_SIZE_MAX}`,
        code: "INVALID_PAGINATION",
      },
    };
  }

  return { valid: true, page, pageSize };
}
