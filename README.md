## 📝 Commit Message Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for commit messages. This leads to more readable messages that are easy to follow when looking through the project history. 🕰️

**Format:**
```
<type>[optional scope]: <description>
```

**Common Types:**
- ✨ `feat`: A new feature
- 🐛 `fix`: A bug fix
- 📚 `docs`: Documentation only changes
- 💅 `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- ♻️ `refactor`: A code change that neither fixes a bug nor adds a feature
- 🚀 `perf`: A code change that improves performance
- 🚨 `test`: Adding missing tests or correcting existing tests
- 🔧 `chore`: Changes to the build process or auxiliary tools and libraries

**Example:**
```
feat(auth): implement google oauth login
```

## 🔐 Authentication Workflow

This project supports two primary authentication workflows: Normal (Credential-based) Login and Google OAuth Login.

### 1️⃣ Normal Login (Username & Password)
- **Register**: Send a `POST` request to `/auth/register` with `username`, `email`, and `password`. 📝
- **Login**: Send a `POST` request to `/auth/login` with `username` and `password`. The server verifies the credentials and returns an `access_token` and user details in the response body. 🔑
- The frontend should store the `access_token` (e.g., in memory or local storage) and include it as a Bearer token in the `Authorization` header for subsequent requests to protected routes. 🛡️

### 2️⃣ Google OAuth Login
- **Initiate**: The frontend redirects the user to `GET /auth/google`. 🌐
- **Consent**: The user logs in to Google and grants permission. ✅
- **Callback**: Google redirects back to the backend at `GET /auth/google/callback`. 🔄
  - The backend validates the Google user profile. 🕵️‍♂️
  - Generates an `access_token`. 🎟️
  - Sets the `access_token` in an **HttpOnly cookie** for security (it cannot be read by JS). 🍪
  - Redirects the user back to the frontend's callback page (e.g., `/auth/google/callback`). 🔙
- **Complete Login Flow & Validate Token**: Because the access token is in an HttpOnly cookie, the frontend must then call `GET /auth/verify-token`. 📞
  - This endpoint validates the token stored in the cookie. ✔️
  - It responds with the authentication details (including user details and menus) so the frontend application state can fully log the user in. 🥳

## 🌍 Environments & Configuration

This project handles environment-specific settings using `.env.development` and `.env.production`. 🛠️

### 🔗 Single Source of Truth
We use **`BACKEND_URL`** as the primary configuration variable. The application automatically derives the following from it:
- **Listening Port**: Extracted from the URL (defaults to 3000 if no port is specified).
- **Google OAuth Callback**: Automatically constructed as `${BACKEND_URL}/api/auth/google/callback`.

### 🏃 Running the Application

To start the application, the `NODE_ENV` variable determines which `.env` file is loaded:

- **👨‍💻 Development:**
  ```bash
  pnpm start:dev
  ```

- **🚀 Production:**
  ```bash
  pnpm start:prod
  ```

### 🗄️ Running Prisma Migrations

Prisma commands are prefixed with `dotenv-cli` to ensure the correct database is targeted. 🔌

- **👨‍💻 Development:** `pnpm migrate:dev`
- **🚀 Production:** `pnpm migrate:prod`

---

## 📁 File Storage Options

The project supports both **Local Disk Storage** and **AWS S3**.

### 1️⃣ Local Storage (Multer)
Ideal for development or self-hosted environments. Files are saved in the root `/uploads` folder.

- **Single Upload**: `POST /api/local-storage/upload/single?folder=my-subfolder`
- **Multiple Upload**: `POST /api/local-storage/upload/multiple?folder=my-subfolder`
- **Accessing Files**: Files are served statically at `${BACKEND_URL}/uploads/...`

### 2️⃣ AWS S3 (Presigned URLs)
High-performance cloud storage. Uses a **presigned URL** flow where the frontend uploads directly to S3.

**Usage Flow:**
1. 📞 Call `POST /api/s3/profile-image` to get a temporary `url`.
2. ⬆️ Frontend `PUT`s the file directly to that `url`.
3. 💾 Save the returned `key` to your database.

---

## 📸 Profile Image Implementation (Example)

Regardless of the storage method, here is how you typically handle a profile image upload from the frontend:

```javascript
// Example using Local Storage
const formData = new FormData();
formData.append('file', imageFile);

const res = await fetch('/api/local-storage/upload/single?folder=avatars', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' },
  body: formData
});

const { data } = await res.json();
console.log('Public URL:', data.url); 
```

### Notes:
- 🖼️ Allowed image types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- ⏱️ S3 Presigned URLs expire after **5 minutes**.
- 🔒 All upload endpoints are protected by the `JwtAuthGuard`.

---

## 🔄 Template Updates

To keep your project up to date with the latest changes from the template repository:

```bash
git fetch template
git merge template/main
```

