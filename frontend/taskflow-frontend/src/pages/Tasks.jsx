import { useEffect, useState } from 'react'
import { CheckSquare, Calendar, AlertCircle, Filter } from 'lucide-react'
import api from '../utils/api'
import { format, isAfter } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_LABELS = { TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done' }
const PRIORITY_COLORS = { LOW: '#9ca3af', MEDIUM: '#3b82f6', HIGH: '#f59e0b', URGENT: '#ef4444' }

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', priority: '', overdue: false })

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.priority) params.set('priority', filters.priority)
      if (filters.overdue) params.set('overdue', 'true')
      const { data } = await api.get(`/tasks?${params}`)
      setTasks(data.data.tasks)
    } catch { toast.error('Failed to load tasks') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filters])

  const updateStatus = async (task, status) => {
    try {
      const { data } = await api.patch(`/tasks/${task.id}`, { status })
      setTasks(t => t.map(x => x.id === task.id ? data.data.task : x))
      toast.success('Status updated')
    } catch { toast.error('Failed') }
  }

  const counts = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'DONE').length,
    overdue: tasks.filter(t => t.dueDate && isAfter(new Date(), new Date(t.dueDate)) && t.status !== 'DONE').length,
  }

  return (
    <div className="page">
      <div className="topbar" style={{ margin: '-32px -32px 32px', padding: '0 32px' }}>
        <h1 className="topbar-title">My Tasks</h1>
      </div>

      {/* Mini stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', value: counts.total, icon: CheckSquare, color: 'var(--primary)' },
          { label: 'Completed', value: counts.done, icon: CheckSquare, color: 'var(--success)' },
          { label: 'Overdue', value: counts.overdue, icon: AlertCircle, color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="stat-label">{s.label}</div>
              <s.icon size={16} style={{ color: s.color, opacity: 0.7 }} />
            </div>
            <div className="stat-value" style={{ color: s.color, fontSize: 22 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--text3)' }} />
        {['', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map(s => (
          <button key={s} className={`chip ${filters.status === s ? 'active' : ''}`}
            onClick={() => setFilters(f => ({ ...f, status: s }))}>
            {s ? STATUS_LABELS[s] : 'All Status'}
          </button>
        ))}
        <div style={{ height: 20, width: 1, background: 'var(--border)', margin: '0 4px' }} />
        {['', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => (
          <button key={p} className={`chip ${filters.priority === p ? 'active' : ''}`}
            onClick={() => setFilters(f => ({ ...f, priority: p }))}>
            {p || 'All Priority'}
          </button>
        ))}
        <div style={{ height: 20, width: 1, background: 'var(--border)', margin: '0 4px' }} />
        <button className={`chip ${filters.overdue ? 'active' : ''}`}
          onClick={() => setFilters(f => ({ ...f, overdue: !f.overdue }))}>
          <AlertCircle size={12} /> Overdue only
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : tasks.length === 0 ? (
          <div className="table-empty">
            <CheckSquare size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
            <p>No tasks found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Assignee</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => {
                  const isOverdue = task.dueDate && isAfter(new Date(), new Date(task.dueDate)) && task.status !== 'DONE'
                  return (
                    <tr key={task.id}>
                      <td>
                        <div style={{ fontWeight: 500, maxWidth: 280 }}>
                          {task.title}
                          {task.tags?.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                              {task.tags.map(t => <span key={t} className="task-tag">{t}</span>)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {task.project && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: task.project.color }} />
                            {task.project.name}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[task.priority] }} />
                          {task.priority}
                        </span>
                      </td>
                      <td>
                        <select
                          value={task.status}
                          onChange={e => updateStatus(task, e.target.value)}
                          className={`badge badge-${task.status.toLowerCase()}`}
                          style={{ border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 11, letterSpacing: 0.3, borderRadius: 99 }}
                        >
                          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>
                      <td>
                        {task.dueDate ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: isOverdue ? 'var(--danger)' : 'var(--text2)' }}>
                            <Calendar size={12} />
                            {format(new Date(task.dueDate), 'MMM d, yyyy')}
                            {isOverdue && <AlertCircle size={12} />}
                          </span>
                        ) : <span style={{ color: 'var(--text3)', fontSize: 13 }}>—</span>}
                      </td>
                      <td>
                        {task.assignee ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="avatar sm">{task.assignee.name.split(' ').map(w => w[0]).join('').toUpperCase()}</div>
                            <span style={{ fontSize: 13 }}>{task.assignee.name}</span>
                          </div>
                        ) : <span style={{ color: 'var(--text3)', fontSize: 13 }}>Unassigned</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
