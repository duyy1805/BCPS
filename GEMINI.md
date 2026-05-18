# BCPS (Business Control/Process System) - Project Context

## Project Overview

BCPS is a full-stack web application designed for reporting, tracking, and managing business exceptions, KPIs, and worklists. It facilitates a workflow-driven process including draft saving, submission, response gathering, approval routing, and closure.

### Main Technologies

- **Backend:** Node.js (v18+) with Express.js.
- **Database:** Microsoft SQL Server (MS SQL) using the `mssql` driver. Business logic is predominantly implemented via **Stored Procedures**.
- **Authentication:** JWT (JSON Web Tokens) based authentication.
- **Frontend:** Vanilla HTML5, CSS3, and JavaScript (ES6+). No heavy frameworks are used.
- **Validation:** `zod` for schema validation in the backend.
- **File Handling:** `multer` for managing file uploads.

---

## Architecture & Project Structure

### Server-Side (`/server`)

The backend follows a layered architecture to separate concerns:

- **`controllers/`**: Handle HTTP requests, extract parameters, and call service methods.
- **`services/`**: Implement core business logic, data transformation (e.g., CSV formatting, boolean casting), and orchestrate repository calls.
- **`repositories/`**: Direct data access layer.
  - `db.repository.js`: A base class for executing stored procedures.
  - Domain-specific repositories (e.g., `report.repository.js`) extend this logic.
- **`routes/`**: API endpoint definitions grouped by domain (Auth, Report, Worklist, Dashboard, KPI).
- **`middlewares/`**:
  - `auth.middleware.js`: Validates JWT and attaches `currentUser` to the request.
  - `error.middleware.js`: Centralized error handling and API response formatting.
  - `upload.middleware.js`: Configures `multer` for local file storage.
- **`config/`**:
  - `env.js`: Centralized environment variable management.
  - `db.js`: SQL Server connection pool management.
- **`common/`**: `api-response.js` provides standardized success/error response structures.

### Client-Side (`/client`)

A lightweight, multi-page application (MPA) structure:

- **`js/api.js`**: The central communication layer using the `fetch` API. Handles JWT headers and global 401/403 redirects.
- **Feature Scripts**: Each HTML page (e.g., `create.html`, `detail.html`) has a corresponding JS file (e.g., `create.js`, `detail.js`) for DOM manipulation and logic.

---

## Building and Running

### Prerequisites

- Node.js installed.
- Access to an MS SQL Server instance with the required database schema and stored procedures.

### Commands

- **Install Dependencies:**
  ```bash
  cd server
  npm install
  ```
- **Run in Development Mode (with nodemon):**
  ```bash
  cd server
  npm run start
  ```
- **Environment Setup:**
  Create a `.env` file in the `server` directory based on the following keys found in `config/env.js`:
  - `PORT`: Server port (default: 5002)
  - `JWT_SECRET`: Secret key for JWT signing
  - `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_DATABASE`, `DB_PORT`: SQL Server credentials
  - `DB_TRUST_CERT`: Set to `true` for local development.

---

## Development Conventions

1.  **Stored Procedures First:** New data operations should ideally be implemented as Stored Procedures in SQL Server and called via the `Repository` layer.
2.  **Standardized Responses:** Always use the `ok` or `error` helpers from `common/api-response.js` in services to maintain consistency.
3.  **Authentication:** Most API routes require a valid JWT. Ensure `authMiddleware` is applied in `routes/`.
4.  **Error Handling:** Use `try-catch` blocks in controllers and pass errors to `next(err)` to trigger the centralized error middleware.
5.  **Frontend API Calls:** Always use the `fetchAPI` function from `js/api.js` to ensure tokens and headers are handled correctly.
6.  **File Uploads:** Uploaded files are stored in `server/uploads/`.

\*\*Cần phải thêm khi hoàn thành báo cáo phát sinh thì nó sẽ điều chỉnh trên ERP
