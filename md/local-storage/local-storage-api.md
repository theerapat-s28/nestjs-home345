# Local Storage API Documentation

This document provides instructions for frontend developers on how to use the `local-storage` module for uploading files to the backend server.

## Base Path

All endpoints in this module are relative to the `/local-storage` base path.

## 1. Upload a Single File

Use this endpoint to upload a single file.

- **URL:** `/local-storage/upload/single`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`

### Query Parameters

| Parameter | Type   | Required | Description                                                                 |
| :-------- | :----- | :------- | :-------------------------------------------------------------------------- |
| `folder`  | string | No       | Optional subfolder name to organize uploads (e.g., `avatars`, `documents`). |

### Request Body (FormData)

| Key    | Type | Required | Description        |
| :----- | :--- | :------- | :----------------- |
| `file` | File | Yes      | The file to upload |

### Example Request (JavaScript/TypeScript)

```typescript
async function uploadSingleFile(file: File, folder?: string) {
  const formData = new FormData();
  formData.append('file', file);

  let url = '/local-storage/upload/single';
  if (folder) {
    url += `?folder=${encodeURIComponent(folder)}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    // Note: Do NOT set the 'Content-Type' header manually when using FormData
    // The browser will automatically set it to 'multipart/form-data' with the correct boundary
    body: formData,
  });

  return response.json();
}
```

### Success Response (201 Created)

```json
{
  "httpCode": 201,
  "message": "File uploaded successfully",
  "data": {
    "filename": "1714638700000-123456789.png",
    "originalName": "avatar.png",
    "mimetype": "image/png",
    "size": 102400,
    "url": "http://localhost:5000/uploads/avatars/1714638700000-123456789.png"
  },
  "timestamp": "2026-05-02T07:55:26.053Z",
  "path": "/api/local-storage/upload/single"
}
```

---

## 2. Upload Multiple Files

Use this endpoint to upload multiple files at once.

- **URL:** `/local-storage/upload/multiple`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data`

### Query Parameters

| Parameter | Type   | Required | Description                                                               |
| :-------- | :----- | :------- | :------------------------------------------------------------------------ |
| `folder`  | string | No       | Optional subfolder name to organize uploads (e.g., `gallery`, `reports`). |

### Request Body (FormData)

| Key     | Type   | Required | Description         |
| :------ | :----- | :------- | :------------------ |
| `files` | File[] | Yes      | The files to upload |

### Example Request (JavaScript/TypeScript)

```typescript
async function uploadMultipleFiles(files: FileList | File[], folder?: string) {
  const formData = new FormData();
  
  // Append each file to the 'files' key
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  let url = '/local-storage/upload/multiple';
  if (folder) {
    url += `?folder=${encodeURIComponent(folder)}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  return response.json();
}
```

### Success Response (201 Created)

```json
{
  "httpCode": 201,
  "message": "2 files uploaded successfully",
  "data": [
    {
      "filename": "1714638700000-123456789.png",
      "originalName": "image1.png",
      "mimetype": "image/png",
      "size": 102400,
      "url": "http://localhost:5000/uploads/gallery/1714638700000-123456789.png"
    },
    {
      "filename": "1714638700000-987654321.jpg",
      "originalName": "image2.jpg",
      "mimetype": "image/jpeg",
      "size": 204800,
      "url": "http://localhost:5000/uploads/gallery/1714638700000-987654321.jpg"
    }
  ],
  "timestamp": "2026-05-02T07:55:26.053Z",
  "path": "/api/local-storage/upload/multiple"
}
```

## Important Notes

- **File Size Limit:** The maximum file size allowed is **10MB** per file.
- **Content-Type Header:** When sending `FormData` using `fetch` or `axios`, **do not** manually set the `Content-Type` header to `multipart/form-data`. The browser needs to set it automatically to include the correct boundary string.
