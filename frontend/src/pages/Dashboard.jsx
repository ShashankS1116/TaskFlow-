import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clock, FolderKanban, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { format, isAfter } from 'date-fns'

const STATUS_COLORS = { TODO: '#6b7280', IN_PROGRESS: '#3b82f6', IN_REVIEW: '#f59e0b', DONE: '#10b981' }
const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done' }
const PRIORITY_COLORS = { LOW: '#9ca3af', MEDIUM: '#3b82f6', HIGH: '#f59e0b', URGENT: '#ef4444' }

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading"><div className="spinner" /></div>
  if (!data) return null

  const { summary, myTasks, recentTasks, upcomingDeadlines, weeklyCompletions } = data
  const maxWeekly = Math.max(...(weeklyCompletions || []).map(d => d.count), 1)

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Good morning, {user?.name?.split(' ')[0]} 👋</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>Here's what's happening with your projects today.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Projects</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{summary.totalProjects}</div>
          <div className="stat-sub">Active projects</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Tasks</div>
          <div className="stat-value">{summary.totalTasks}</div>
          <div className="stat-sub">{summary.tasksByStatus?.DONE || 0} completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overdue</div>
          <div className="stat-value" style={{ color: summary.overdueTasks > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {summary.overdueTasks}
          </div>
          <div className="stat-sub">Need attention</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completion Rate</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{summary.completionRate}%</div>
          <div style={{ marginTop: 8 }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${summary.completionRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
        {/* Task status breakdown */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Tasks by Status</span>
          </div>
          {Object.entries(summary.tasksByStatus || {}).map(([status, count]) => (
            <div key={status} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</span>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{count}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: summary.totalTasks ? `${(count / summary.totalTasks) * 100}%` : '0%',
                  background: STATUS_COLORS[status]
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Weekly completions chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Completions This Week</span>
            <TrendingUp size={16} style={{ color: 'var(--text3)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
            {(weeklyCompletions || []).map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', borderRadius: 4,
                  background: d.count > 0 ? 'var(--primary)' : 'var(--surface2)',
                  height: `${Math.max((d.count / maxWeekly) * 80, d.count > 0 ? 8 : 4)}px`,
                  minHeight: 4, transition: 'height 0.3s ease'
                }} />
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                  {format(new Date(d.date), 'EEE')}
                </span>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
            {(weeklyCompletions || []).reduce((s, d) => s + d.count, 0)} tasks completed
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        {/* My tasks */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">My Tasks</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all</button>
          </div>
          {myTasks?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)' }}>
              <CheckCircle2 size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ fontSize: 13 }}>All caught up!</p>
            </div>
          )}
          {myTasks?.slice(0, 5).map(task => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[task.priority], marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{task.title}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--primary)', background: 'var(--primary-light)', padding: '1px 6px', borderRadius: 4 }}>
                    {task.project.name}
                  </span>
                  {task.dueDate && (
                    <span style={{ fontSize: 11, color: isAfter(new Date(), new Date(task.dueDate)) ? 'var(--danger)' : 'var(--text3)', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Clock size={10} /> {format(new Date(task.dueDate), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
              <span className={`badge badge-${task.status.toLowerCase()}`}>{STATUS_LABELS[task.status]}</span>
            </div>
          ))}
        </div>

        {/* Upcoming deadlines */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Upcoming Deadlines</span>
            <AlertCircle size={16} style={{ color: 'var(--warning)' }} />
          </div>
          {upcomingDeadlines?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)' }}>
              <Clock size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ fontSize: 13 }}>No deadlines in the next 14 days</p>
            </div>
          )}
          {upcomingDeadlines?.map(project => (
            <div key={project.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
              onClick={() => navigate(`/projects/${project.id}`)}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500 }}>{project.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)' }}>{project._count.tasks} tasks</p>
              </div>
              <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 500 }}>
                {format(new Date(project.deadline), 'MMM d')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
