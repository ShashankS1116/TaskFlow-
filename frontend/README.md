# TaskFlow Frontend

React frontend for the TaskFlow Team Task Manager API.

## Setup

```bash
# Install dependencies
npm install

# Start dev server (make sure backend is running on port 3000)
npm run dev
```

Open http://localhost:5173

## Demo login
- Admin: admin@taskflow.dev / Password123!
- Member: bob@taskflow.dev / Password123!

## Pages
- `/` — Dashboard with stats and charts
- `/projects` — Project list and creation
- `/projects/:id` — Kanban board for a project
- `/tasks` — My tasks with filters
- `/team` — Team management (Admin only)

## Build for production
```bash
npm run build
```
