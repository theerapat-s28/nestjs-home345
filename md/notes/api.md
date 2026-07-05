# Notes API

All endpoints are **public** — no authentication required.

Base path: `/notes`

---

## Notes

### Create a Note
`POST /notes`

**Body**
```json
{
  "title": "Shopping list",
  "content": "Milk, eggs, bread",
  "expiresAt": "2026-06-01T00:00:00.000Z"
}
```

| Field       | Type   | Required | Description                                          |
|-------------|--------|----------|------------------------------------------------------|
| `title`     | string | No       | Note title (max 255 chars)                           |
| `content`   | string | No       | Note body text                                       |
| `expiresAt` | string | No       | ISO 8601 datetime. Omit for a permanent note.        |

**Response** `201`
```json
{
  "message": "Note created successfully",
  "data": {
    "id": "uuid",
    "title": "Shopping list",
    "content": "Milk, eggs, bread",
    "expiresAt": "2026-06-01T00:00:00.000Z",
    "createdAt": "...",
    "updatedAt": "...",
    "attachments": []
  }
}
```

---

### List Notes
`GET /notes`

Returns notes ordered by `createdAt DESC`. Expired notes are hidden by default.

**Query Parameters**

| Parameter       | Type    | Default | Description                                       |
|-----------------|---------|---------|---------------------------------------------------|
| `search`        | string  | —       | Search in `title` and `content` (case-insensitive)|
| `includeExpired`| boolean | `false` | Set to `true` to include expired notes            |
| `limit`         | number  | `20`    | Page size                                         |
| `offset`        | number  | `0`     | Records to skip                                   |

**Response** `200`
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Shopping list",
      "content": "Milk, eggs, bread",
      "expiresAt": null,
      "createdAt": "...",
      "updatedAt": "...",
      "attachments": [
        {
          "id": "uuid",
          "noteId": "uuid",
          "key": "1714638700000-123456789.pdf",
          "fileName": "receipt.pdf",
          "mimeType": "application/pdf",
          "url": "http://localhost:5000/uploads/note-attachments/1714638700000-123456789.pdf",
          "createdAt": "..."
        }
      ]
    }
  ],
  "meta": {
    "totalRecords": 5,
    "limit": 20,
    "offset": 0
  }
}
```

---

### Get a Note
`GET /notes/:id`

**Response** `200` — note with nested `attachments` (each includes a `url` field)
**Response** `404` — note not found

---

### Update a Note
`PATCH /notes/:id`

**Body** — all fields optional
```json
{
  "title": "Updated title",
  "content": "Updated content",
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

**Response** `200` — updated note

---

### Delete a Note
`DELETE /notes/:id`

Permanently deletes the note, all attachment records, and the corresponding files from disk.

**Response** `200`
```json
{ "message": "Note deleted successfully", "data": null }
```

---

## Attachments

Attachments are uploaded as `multipart/form-data`. Files are stored in `uploads/note-attachments/` on the server and served as static files. Each attachment in a response includes a ready-to-use `url` field — no extra step needed.

**File size limit:** 10 MB per file.

---

### Upload an Attachment
`POST /notes/:noteId/attachments`

- **Content-Type:** `multipart/form-data`
- Form field name: **`file`**

**Example (TypeScript/fetch)**
```typescript
async function uploadNoteAttachment(noteId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  // Do NOT set Content-Type manually — let the browser set it with the boundary
  const response = await fetch(`/api/notes/${noteId}/attachments`, {
    method: 'POST',
    body: formData,
  });

  return response.json();
}
```

**Response** `201`
```json
{
  "message": "Attachment uploaded successfully",
  "data": {
    "id": "uuid",
    "noteId": "uuid",
    "key": "1714638700000-123456789.pdf",
    "fileName": "receipt.pdf",
    "mimeType": "application/pdf",
    "url": "http://localhost:5000/uploads/note-attachments/1714638700000-123456789.pdf",
    "createdAt": "..."
  }
}
```

**Response** `400` — no file included in the request
**Response** `404` — note not found

---

### Delete an Attachment
`DELETE /notes/:noteId/attachments/:attachmentId`

Removes the file from disk and the record from the database.

**Response** `200`
```json
{ "message": "Attachment deleted successfully", "data": null }
```

**Response** `404` — attachment not found or does not belong to the note

---

## Error Responses

| Code | Meaning                              |
|------|--------------------------------------|
| 400  | Validation error or missing file     |
| 404  | Note or attachment not found         |
