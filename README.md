# Backend - URL Shortener Service

## Tech Stack Contract

This document outlines the technologies, libraries, and architectural decisions used in the backend of the URL Shortener application. This serves as a reference for the development team to ensure consistency and understanding of the core infrastructure.

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Runtime** | Node.js | LTS | JavaScript runtime environment |
| **Language** | TypeScript | ^5.3.3 | Static typing and enhanced developer experience |
| **Framework** | Express.js | ^4.18.3 | Minimalist web framework for building APIs |
| **ORM** | Prisma | ^5.10.2 | Type-safe database client and schema management |
| **Task Scheduling** | node-cron | ^4.2.1 | Scheduled background tasks (e.g., cleanup) |
| **Utilities** | CORS, Dotenv | Latest | Security and configuration management |

---

## Detailed Tech Stack & Usage

### 1. Core Framework: Express.js
**Why:** Express is the industry standard for Node.js server-side applications. It provides a thin layer of fundamental web application features without obscuring Node.js features.
**How:** Used to define API routes, handle HTTP requests/responses, and manage middleware for logging, error handling, and CORS.

### 2. Language: TypeScript
**Why:** TypeScript adds static definitions to JavaScript, significantly reducing runtime errors and improving code maintainability through self-documenting code and IDE support.
**How:** All source code is written in `.ts` files. We use `tsx` for running the development server and `tsc` for building the production artifacts.

### 3. Database ORM: Prisma
**Why:** Prisma provides the best-in-class developer experience for working with databases. Its auto-generated type-safe client ensures that database queries are checked at compile-time, preventing common SQL injection attacks and schema mismatch errors.
**How:**
- **Schema Definition:** `prisma/schema.prisma` defines the data model.
- **Client:** Used in services/controllers to interact with the database (CRUD operations).
- **Migrations:** Manages database schema changes versioning.

### 4. Background Jobs: node-cron
**Why:** The application requires periodic maintenance tasks, such as removing expired URLs or aggregating statistics, which should not block the main request-response cycle.
**How:** Configured to run specific functions at defined intervals (cron expressions) to handle background maintenance.

### 5. Utilities
- **CORS:** Configured to allow secure cross-origin requests from our specific frontend domain.
- **Dotenv:** Loads environment variables from `.env` files to manage sensitive configuration (DB URLs, API keys) securely outside the codebase.

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- A running database instance (PostgreSQL/MySQL as defined in Prisma)

### Installation

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Setup**
    Copy `.env.example` to `.env` and fill in your variables:
    ```bash
    cp .env.example .env
    ```

3.  **Database Setup**
    Run Prisma migrations to set up your database schema:
    ```bash
    npx prisma migrate dev
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

5.  **Build for Production**
    ```bash
    npm run build
    npm run prod
    ```
