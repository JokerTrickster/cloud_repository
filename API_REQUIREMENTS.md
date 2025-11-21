# API Requirements Documentation

Based on the current frontend implementation, the following APIs are required.

## Base URL
- Local: `http://localhost:8080` (or your local port)
- Dev: `https://dev-api.yourdomain.com`

## Authentication (Future)
Currently mocked, but will likely need:
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me` (Get current user info)

## Files (Gallery & Upload)

### 1. List Files
Retrieves the list of files for the Gallery.
- **Endpoint**: `GET /api/files`
- **Query Parameters**:
  - `page`: Number (default: 1)
  - `limit`: Number (default: 50)
  - `sort`: String ('date' | 'name' | 'tag')
  - `order`: String ('asc' | 'desc')
  - `search`: String (optional, filename or #tag)
  - `date`: String (optional, 'YYYY-MM-DD' for filtering by specific date)
- **Response**:
  ```json
  {
    "data": [
      {
        "id": "string",
        "url": "string",
        "thumbnailUrl": "string",
        "name": "string",
        "type": "image/jpeg",
        "size": 1024,
        "date": "2025-11-21",
        "tags": ["tag1", "tag2"]
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 50
    }
  }
  ```

### 2. Upload Files
Uploads new files.
- **Endpoint**: `POST /api/files`
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `files`: File[] (Max 30 files)
- **Response**:
  ```json
  {
    "success": true,
    "uploaded": 5,
    "failed": 0
  }
  ```

### 3. Delete Files
- **Endpoint**: `DELETE /api/files`
- **Body**:
  ```json
  {
    "ids": ["file_id_1", "file_id_2"]
  }
  ```

### 4. Download Files
- **Endpoint**: `GET /api/files/download`
- **Query Parameters**:
  - `ids`: Comma-separated list of file IDs (e.g., `?ids=1,2,3`)
  - **Note**: If multiple files, server should return a ZIP.

## User & Activity (MyPage)

### 1. User Stats
Retrieves storage usage and general stats.
- **Endpoint**: `GET /api/user/stats`
- **Response**:
  ```json
  {
    "storage": {
      "used": 11250000000, // Bytes
      "total": 15000000000, // Bytes
      "percentage": 75
    },
    "monthlyStats": {
      "uploads": 128,
      "downloads": 45,
      "tagsCreated": 12
    }
  }
  ```

### 2. Activity History (Calendar)
Retrieves daily activity for the calendar view.
- **Endpoint**: `GET /api/user/activity`
- **Query Parameters**:
  - `month`: String ('YYYY-MM')
- **Response**:
  ```json
  {
    "2025-11-21": {
      "uploads": 12,
      "downloads": 5,
      "tags": ["travel", "food"]
    },
    "2025-11-20": {
      "uploads": 45,
      "downloads": 0,
      "tags": ["work"]
    }
  }
  ```
