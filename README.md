# TaskFlow API 🚀

A production-ready **Team Task Manager REST API** built with Node.js, Express, Prisma ORM, and PostgreSQL. Features JWT authentication, role-based access control, project management, task tracking, and a rich analytics dashboard.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Auth** | JWT access + refresh tokens, bcrypt passwords, rate limiting |
| **RBAC** | Global roles (Admin/Member) + per-project roles |
| **Projects** | CRUD, member management, archiving, deadlines |
| **Tasks** | CRUD, status tracking, priority, due dates, tags, comments |
| **Dashboard** | Task stats, overdue alerts, weekly completions, project analytics |
| **Security** | Helmet, CORS, rate limiting, input validation |

---

## 🏗️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **ORM**: Prisma 5 (type-safe, auto-migrations)
- **Database**: PostgreSQL
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Validation**: express-validator
- **Security**: helmet, cors, express-rate-limit

---

## 📁 Project Structure

```
taskflow/
├── prisma/
│   └── schema.prisma          # Database models
├── src/
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── project.controller.js
│   │   ├── task.controller.js
│   │   └── dashboard.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js  # JWT + RBAC guards
│   │   ├── error.middleware.js # Global error handler
│   │   └── validate.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── project.routes.js
│   │   ├── task.routes.js
│   │   └── dashboard.routes.js
│   ├── utils/
│   │   ├── jwt.js
│   │   ├── prisma.js           # Singleton client
│   │   ├── response.js
│   │   └── seed.js
│   ├── app.js                  # Express setup
│   └── server.js               # Entry point
├── .env.example
├── railway.toml
└── package.json
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally

### 1. Clone & install
```bash
git clone https://github.com/YOUR_USERNAME/taskflow-api.git
cd taskflow-api
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your local PostgreSQL credentials
```

### 3. Run migrations & seed
```bash
npm run db:migrate    # Apply schema to database
npm run db:seed       # Seed with demo data
```

### 4. Start the server
```bash
npm run dev           # Development (auto-reload)
npm start             # Production
```

Server runs on `http://localhost:3000`

### Seeded Credentials
| Role | Email | Password |
|---|---|---|
| Admin | `admin@taskflow.dev` | `Password123!` |
| Member | `bob@taskflow.dev` | `Password123!` |
| Member | `carol@taskflow.dev` | `Password123!` |

---

## 🌐 Deploy to Railway

### Step 1 — Create Railway project
1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo**
3. Connect your GitHub and select this repo

### Step 2 — Add PostgreSQL
1. Click **+ New** → **Database** → **Add PostgreSQL**
2. Railway automatically injects `DATABASE_URL` into your environment

### Step 3 — Set environment variables
In Railway project settings → **Variables**, add:
```
NODE_ENV=production
JWT_SECRET=<generate: openssl rand -base64 64>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

### Step 4 — Deploy
Railway auto-deploys on every push to `main`. The `railway.toml` config runs:
```
npx prisma migrate deploy && node src/server.js
```

### Step 5 — Seed production data (optional)
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login
railway run npm run db:seed
```

### Step 6 — Get your live URL
Railway provides a URL like: `https://taskflow-api-production.up.railway.app`

---

## 📚 API Reference

### Base URL
```
https://your-app.up.railway.app/api
```

### Authentication
All protected routes require:
```
Authorization: Bearer <accessToken>
```

---

### Auth Endpoints

#### `POST /api/auth/signup`
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password123!"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "Jane Doe", "email": "...", "role": "MEMBER" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

#### `POST /api/auth/login`
```json
{ "email": "jane@example.com", "password": "Password123!" }
```

#### `POST /api/auth/refresh`
```json
{ "refreshToken": "eyJ..." }
```

#### `GET /api/auth/me` 🔒
Returns the current authenticated user's profile.

#### `PUT /api/auth/change-password` 🔒
```json
{ "currentPassword": "Password123!", "newPassword": "NewPass456!" }
```

---

### User Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | List all users |
| `GET` | `/api/users/:id` | ✅ | Get user profile |
| `PATCH` | `/api/users/:id` | ✅ | Update profile (own or Admin) |
| `DELETE` | `/api/users/:id` | Admin | Delete user |

---

### Project Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects` | ✅ | List accessible projects |
| `POST` | `/api/projects` | ✅ | Create project |
| `GET` | `/api/projects/:id` | Member | Get project + tasks |
| `PATCH` | `/api/projects/:id` | Project Admin | Update project |
| `DELETE` | `/api/projects/:id` | Project Admin | Delete project |
| `POST` | `/api/projects/:id/members` | Project Admin | Add member |
| `PATCH` | `/api/projects/:id/members/:userId` | Project Admin | Change member role |
| `DELETE` | `/api/projects/:id/members/:userId` | Project Admin | Remove member |

**Create project body:**
```json
{
  "name": "Website Redesign",
  "description": "New brand identity",
  "color": "#6366f1",
  "deadline": "2025-12-31"
}
```

---

### Task Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/tasks` | ✅ | List tasks (filterable) |
| `POST` | `/api/tasks` | ✅ | Create task |
| `GET` | `/api/tasks/:id` | Member | Get task + comments |
| `PATCH` | `/api/tasks/:id` | Member | Update task |
| `DELETE` | `/api/tasks/:id` | Member | Delete task |
| `POST` | `/api/tasks/:id/comments` | Member | Add comment |
| `PATCH` | `/api/tasks/:id/comments/:cid` | Author | Edit comment |
| `DELETE` | `/api/tasks/:id/comments/:cid` | Author | Delete comment |

**Task query params:**
```
GET /api/tasks?projectId=...&status=IN_PROGRESS&priority=HIGH&overdue=true&page=1&limit=20
```

**Create task body:**
```json
{
  "title": "Design homepage mockup",
  "description": "Create 3 Figma variations",
  "status": "TODO",
  "priority": "HIGH",
  "dueDate": "2025-06-15",
  "projectId": "proj_abc123",
  "assigneeId": "user_xyz789",
  "tags": ["design", "figma"]
}
```

**Task statuses:** `TODO` | `IN_PROGRESS` | `IN_REVIEW` | `DONE`  
**Task priorities:** `LOW` | `MEDIUM` | `HIGH` | `URGENT`

---

### Dashboard Endpoints

#### `GET /api/dashboard` 🔒
Returns aggregated stats for the current user:
```json
{
  "summary": {
    "totalProjects": 5,
    "totalTasks": 42,
    "overdueTasks": 3,
    "completionRate": 67,
    "tasksByStatus": { "TODO": 10, "IN_PROGRESS": 4, "IN_REVIEW": 2, "DONE": 26 }
  },
  "myTasks": [...],
  "recentTasks": [...],
  "upcomingDeadlines": [...],
  "weeklyCompletions": [{ "date": "2025-06-01", "count": 3 }, ...]
}
```

#### `GET /api/dashboard/project/:projectId` 🔒
Per-project breakdown: tasks by status, priority, assignee, overdue count.

---

## 🔐 Role-Based Access Control

### Global Roles
| Role | Capabilities |
|---|---|
| **ADMIN** | Full access to all projects, users, tasks |
| **MEMBER** | Access only to projects they're members of |

### Project Roles
| Role | Capabilities |
|---|---|
| **ADMIN** | Update/delete project, manage members, all task operations |
| **MEMBER** | View project, create/update/delete tasks, add comments |

---

## 🛡️ Security Features

- **Helmet** — Sets secure HTTP headers
- **CORS** — Configurable allowed origins
- **Rate limiting** — 100 req/15min globally, 10 req/15min for auth routes
- **bcrypt** — Password hashing (12 rounds)
- **JWT** — Short-lived access tokens (7d) + refresh tokens (30d)
- **Input validation** — All inputs validated via express-validator
- **Prisma** — Parameterized queries prevent SQL injection

---

## 🗄️ Data Models

```
User ──< ProjectMember >── Project ──< Task ──< Comment
                                         │
                                    User (assignee)
```

- **User**: Global role, owns projects, assigned to tasks
- **Project**: Has members with per-project roles
- **ProjectMember**: Join table with role (ADMIN/MEMBER)
- **Task**: Belongs to project, optional assignee, auto-sets completedAt
- **Comment**: Belongs to task and author

---

## 📊 Health Check

```bash
curl https://your-app.up.railway.app/health
# { "status": "ok", "timestamp": "...", "version": "1.0.0" }
```

---

## 🧪 Quick Test with cURL

```bash
BASE=https://your-app.up.railway.app/api

# 1. Login
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@taskflow.dev","password":"Password123!"}' \
  | jq -r '.data.accessToken')

# 2. Get dashboard
curl -H "Authorization: Bearer $TOKEN" $BASE/dashboard

# 3. Create project
curl -X POST $BASE/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","description":"First project","color":"#10b981"}'
```

---

## 📝 License

MIT
