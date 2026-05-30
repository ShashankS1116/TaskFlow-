import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderKanban, Calendar, Users } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6']

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function CreateModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1', deadline: '' })
  const [loading, setLoading] = useState(false)
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/projects', form)
      onCreate(data.data.project)
      toast.success('Project created!')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">New Project</h2>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-input" name="name" value={form.name} onChange={handle} placeholder="e.g. Website Redesign" required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" name="description" value={form.description} onChange={handle} placeholder="What is this project about?" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: form.color === c ? '2px solid var(--text)' : '2px solid transparent', transition: 'all 0.15s' }} />
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Deadline</label>
              <input className="form-input" type="date" name="deadline" value={form.deadline} onChange={handle} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Projects() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data.data.projects)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="topbar" style={{ margin: '-32px -32px 32px', padding: '0 32px' }}>
        <h1 className="topbar-title">Projects</h1>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FolderKanban size={40} /></div>
          <h2 className="empty-title">No projects yet</h2>
          <p className="empty-sub">Create your first project to get started</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {projects.map(p => (
            <div key={p.id} className="project-card" onClick={() => navigate(`/projects/${p.id}`)}>
              <div className="project-color-bar" style={{ background: p.color }} />
              <div className="project-title">{p.name}</div>
              <div className="project-desc">{p.description || 'No description'}</div>
              <div className="project-meta">
                <div className="member-stack">
                  {p.members?.slice(0, 4).map(m => (
                    <div key={m.id} className="avatar sm" title={m.user.name}>{getInitials(m.user.name)}</div>
                  ))}
                  {p.members?.length > 4 && (
                    <div className="avatar sm" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>+{p.members.length - 4}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text3)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Users size={11} /> {p._count?.members || 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <FolderKanban size={11} /> {p._count?.tasks || 0}
                  </span>
                  {p.deadline && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Calendar size={11} /> {format(new Date(p.deadline), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={p => setProjects(ps => [p, ...ps])}
        />
      )}
    </div>
  )
}
