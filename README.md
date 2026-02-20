# forum-backend

## Notes for API design

All very classic stuff, but good to make note and keep track of for now...

- Base URL: `https://api.bradley-hill.com/api`

- Response structure:

```json
{
  "data": ...
}
```

- Error structure:

```json
{
  "error": {
    "message": "describe the error",
    "code": "ERROR_CODE"
  }
}
```

- Pagination will be page based (classic forum style)

Defaults:

- `page` = 1
- `pageSize` = 20
- `pageSize` max = 50 (enforced server-side)

## HTTP Status Codes

- `200` OK — successful GET request
- `201` Created — successful POST (resource created)
- `400` Bad Request — invalid request body or pagination parameters
- `401` Unauthorized — missing or invalid access token
- `403` Forbidden — valid token but insufficient role
- `404` Not Found — category or thread does not exist
- `409` Conflict — username or email already registered
- `500` Internal Server Error — unexpected server error

Note:

- `author` may be null if the user account has been deleted.
- Frontend should display "Deleted User" in this case.

---

## Authentication

JWT-based auth with access + refresh token pattern.

### Tokens

- **Access token** — expires after 1 hour. Sent with every protected request.
- **Refresh token** — expires after 7 days. Used only to obtain a new access token.

### Using the access token

Protected routes require the following header:

```
Authorization: Bearer <access_token>
```

### JWT payload

```json
{
  "id": "uuid",
  "username": "bradley",
  "role": "member"
}
```

### Roles

- `member` — default role on registration
- `admin` — assigned directly in the database, not via API

---

### POST /api/auth/register

Request body:

```json
{
  "username": "bradley",
  "email": "bradley@example.com",
  "password": "plaintext-password"
}
```

Success response `201`:

```json
{
  "data": {
    "id": "uuid",
    "username": "bradley",
    "email": "bradley@example.com"
  }
}
```

Errors:

- 400 — missing required fields
- 409 — username or email already taken

---

### POST /api/auth/login

Request body:

```json
{
  "email": "bradley@example.com",
  "password": "plaintext-password"
}
```

Success response `200`:

```json
{
  "data": {
    "accessToken": "jwt.access.token",
    "refreshToken": "jwt.refresh.token"
  }
}
```

Errors:

- 400 — missing required fields
- 401 — invalid credentials

---

### POST /api/auth/refresh

Request body:

```json
{
  "refreshToken": "jwt.refresh.token"
}
```

Success response `200`:

```json
{
  "data": {
    "accessToken": "jwt.access.token"
  }
}
```

Errors:

- 400 — missing refresh token
- 401 — invalid or expired refresh token

---

### POST /api/auth/logout

Requires: `Authorization: Bearer <access_token>` header

Request body:

```json
{
  "refreshToken": "jwt.refresh.token"
}
```

Success response `200`:

```json
{
  "data": {
    "message": "Logged out successfully"
  }
}
```

Errors:

- 401 — missing or invalid access token

### Protected routes

- `POST /api/categories` — requires valid token + `role: admin`
- `POST /api/threads` — requires valid token (any role)
- `POST /api/posts` — requires valid token (any role), thread must not be locked

---

## Endpoints

### GET /api/categories

Forum homepage — returns all categories.

Response `200`:

```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "general",
      "name": "General Discussion",
      "description": "Talk about anything and everything."
    }
  ]
}
```

---

### GET /api/categories/:slug/threads

List threads in a category. Example: `/api/categories/general/threads?page=1`

#### Sorting rules

Threads sorted by `is_sticky DESC`, then `updated_at DESC` — classic forum ordering.

Response `200`:

```json
{
  "data": {
    "category": {
      "id": "uuid",
      "slug": "general",
      "name": "General Discussion"
    },
    "threads": [
      {
        "id": "uuid",
        "title": "Welcome to the forum",
        "is_sticky": true,
        "is_locked": false,
        "created_at": "2026-01-01T12:00:00Z",
        "updated_at": "2026-01-02T09:30:00Z",
        "author": {
          "id": "uuid",
          "username": "admin"
        },
        "reply_count": 12
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalThreads": 42,
      "totalPages": 3
    }
  }
}
```

---

### GET /api/threads/:id

View a thread and its posts. Example: `/api/threads/550e8400-e29b-41d4-a716-446655440000?page=1`

#### Pagination rules

- Posts ordered by `created_at ASC`
- Original post included as the first post

Response `200`:

```json
{
  "data": {
    "thread": {
      "id": "uuid",
      "title": "Welcome to the forum",
      "is_sticky": true,
      "is_locked": false,
      "created_at": "2026-01-01T12:00:00Z",
      "author": {
        "id": "uuid",
        "username": "admin"
      }
    },
    "posts": [
      {
        "id": "uuid",
        "content": "Hello everyone!",
        "created_at": "2026-01-01T12:00:00Z",
        "updated_at": "2026-01-01T12:00:00Z",
        "author": {
          "id": "uuid",
          "username": "admin"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalPosts": 35,
      "totalPages": 2
    }
  }
}
```

---

## Error Handling

- Category not found:

```json
{
  "error": {
    "message": "Category not found",
    "code": "CATEGORY_NOT_FOUND"
  }
}
```

- Thread not found:

```json
{
  "error": {
    "message": "Thread not found",
    "code": "THREAD_NOT_FOUND"
  }
}
```
