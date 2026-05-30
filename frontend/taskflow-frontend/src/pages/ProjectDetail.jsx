import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, Users, Calendar, Trash2, X } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { format, isAfter } from 'date-fns'
import { useAuth } from '../context/AuthContext'

const COLUMNS = [
  { key: 'TODO', label: 'To Do', color: '#6b7280' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6' },
  { key: 'IN_REVIEW', label: 'In Review', color: '#f59e0b' },
  { key: 'DONE', label: 'Done', color: '#10b981' },
]
const PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT']
const PRIORITY_COLORS = { LOW: '#9ca3af', MEDIUM: '#3b82f6', HIGH: '#f59e0b', URGENT: '#ef4444' }

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function TaskModal({ task, project, onClose, onUpdate, onDelete }) {
  const [form, setForm] = useState({
    title: task?.title || '', description: task?.description || '',
    status: task?.status || 'TODO', priority: task?.priority || 'MEDIUM',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
    assigneeId: task?.assignee?.id || '', tags: task?.tags?.join(', ') || ''
  })
  const [loading, setLoading] = useState(false)
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [], assigneeId: form.assigneeId || null, dueDate: form.dueDate || null }
      if (task) {
        const { data } = await api.patch(`/tasks/${task.id}`, payload)
        onUpdate(data.data.task)
        toast.success('Task updated')
      } else {
        const { data } = await api.post('/tasks', { ...payload, projectId: project.id })
        onUpdate(data.data.task, true)
        toast.success('Task created')
      }
      onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return
    await api.delete(`/tasks/${task.id}`)
    onDelete(task.id)
    toast.success('Task deleted')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" name="title" value={form.title} onChange={handle} placeholder="Task title" required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" name="description" value={form.description} onChange={handle} placeholder="Describe this task..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" name="status" value={form.status} onChange={handle}>
                {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" name="priority" value={form.priority} onChange={handle}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select className="form-select" name="assigneeId" value={form.assigneeId} onChange={handle}>
                <option value="">Unassigned</option>
                {project.members?.map(m => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" name="dueDate" value={form.dueDate} onChange={handle} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tags</label>
            <input className="form-input" name="tags" value={form.tags} onChange={handle} placeholder="design, frontend, urgent (comma separated)" />
          </div>
          <div className="modal-footer">
            {task && <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} style={{ marginRight: 'auto' }}><Trash2 size={14} /> Delete</button>}
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [taskModal, setTaskModal] = useState(null) // null | 'new' | task object

  useEffect(() => {
    api.get(`/projects/${id}`).then(r => {
      setProject(r.data.data.project)
      setTasks(r.data.data.project.tasks || [])
    }).catch(() => navigate('/projects')).finally(() => setLoading(false))
  }, [id])

  const handleTaskUpdate = (updated, isNew) => {
    if (isNew) setTasks(t => [updated, ...t])
    else setTasks(t => t.map(x => x.id === updated.id ? updated : x))
  }
  const handleTaskDelete = id => setTasks(t => t.filter(x => x.id !== id))

  const quickStatusChange = async (task, newStatus) => {
    try {
      const { data } = await api.patch(`/tasks/${task.id}`, { status: newStatus })
      setTasks(t => t.map(x => x.id === task.id ? data.data.task : x))
    } catch { toast.error('Failed to update') }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>
  if (!project) return null

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key)
    return acc
  }, {})

  return (
    <div className="page" style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/projects')}><ArrowLeft size={18} /></button>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: project.color }} />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{project.name}</h1>
          {project.description && <p style={{ fontSize: 13, color: 'var(--text2)' }}>{project.description}</p>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
            <Users size={14} /> {project.members?.length} members
          </div>
          {project.deadline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
              <Calendar size={14} /> {format(new Date(project.deadline), 'MMM d, yyyy')}
            </div>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setTaskModal('new')}>
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {/* Members row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {project.members?.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 99, padding: '4px 10px 4px 6px' }}>
            <div className="avatar sm">{getInitials(m.user.name)}</div>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{m.user.name}</span>
            <span className={`badge badge-${m.role.toLowerCase()}`} style={{ fontSize: 10 }}>{m.role}</span>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="board">
        {COLUMNS.map(col => (
          <div key={col.key} className="board-col">
            <div className="board-col-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span className="board-col-title">{col.label}</span>
              </div>
              <span className="board-col-count">{tasksByStatus[col.key].length}</span>
            </div>

            {tasksByStatus[col.key].map(task => (
              <div key={task.id} className="task-card" onClick={() => setTaskModal(task)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[task.priority], marginTop: 4 }} />
                  {task.assignee && (
                    <div className="avatar sm" title={task.assignee.name}>{getInitials(task.assignee.name)}</div>
                  )}
                </div>
                <div className="task-card-title">{task.title}</div>
                {task.tags?.length > 0 && (
                  <div className="task-card-tags">
                    {task.tags.slice(0, 2).map(tag => <span key={tag} className="task-tag">{tag}</span>)}
                  </div>
                )}
                <div className="task-card-meta">
                  {task.dueDate && (
                    <span className={`due-date ${isAfter(new Date(), new Date(task.dueDate)) && task.status !== 'DONE' ? 'overdue' : ''}`}>
                      <Calendar size={10} /> {format(new Date(task.dueDate), 'MMM d')}
                    </span>
                  )}
                  {task._count?.comments > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>💬 {task._count.comments}</span>
                  )}
                </div>
              </div>
            ))}

            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, color: 'var(--text3)', fontSize: 13 }}
              onClick={() => setTaskModal('new')}
            >
              <Plus size={13} /> Add
            </button>
          </div>
        ))}
      </div>

      {taskModal && (
        <TaskModal
          task={taskModal === 'new' ? null : taskModal}
          project={project}
          onClose={() => setTaskModal(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  )
}
