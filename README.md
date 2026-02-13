# forum-backend

## Notes for API design

All very classic stuff, but good to make note and keep track of for now...

- Base URL : https://api.bradley-hill.com/api

- Response structure :

```
{
  "data": ...
}
```

- Error Structure :

```
{
  "error": {
    "message":"describe the error",
    "code":"ERROR_CODE"
  }
}
```

- Pagination will be page based (classic forum style) 
Defaults:
- page = 1
- pageSize = 20
- pageSize max = 50 (to be enforced server-side)

- ## HTTP Status Codes (for frontend work)

- 200 OK — successful GET request
- 400 Bad Request — invalid pagination parameters
- 404 Not Found — category or thread does not exist
- 500 Internal Server Error — unexpected server error

Note:
- `author` may be null if the user account has been deleted.
- Frontend should display "Deleted User" in this case.

## Endpoints

### Forum Homepage / List Categories
- GET /api/categories

- Response
```
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

### List Threads in a Category
- GET /api/categories/:slug/threads
Example = GET /api/categories/general/threads?page=1

#### Sorting Rules:

Threads must be sorted by:

is_sticky DESC
updated_at DESC

This is to maintain traditional Forum ordering.

- Response Shape
```
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

### View Thread (List posts)
- GET /api/threads/:id
Example = GET /api/threads/550e8400-e29b-41d4-a716-446655440000?page=1

#### Pagination Rules

Posts are paginated
Ordered by created_at ASC

Original Post is included as the first post.

- Response Shape
```
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

### Error Handling

- Category not found =
```
{
  "error": {
    "message": "Category not found",
    "code": "CATEGORY_NOT_FOUND"
  }
}
```

- Thread not found =
```
{
  "error": {
    "message": "Thread not found",
    "code": "THREAD_NOT_FOUND"
  }
}
```
