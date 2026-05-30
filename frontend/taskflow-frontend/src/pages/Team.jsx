import { useEffect, useState } from 'react'
import { Users, Search, Shield, UserCheck } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  { bg: '#eef2ff', color: '#6366f1' }, { bg: '#ecfdf5', color: '#10b981' },
  { bg: '#fffbeb', color: '#f59e0b' }, { bg: '#fef2f2', color: '#ef4444' },
  { bg: '#eff6ff', color: '#3b82f6' },
]

export default function Team() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (user?.role !== 'ADMIN') { navigate('/'); return }
    api.get('/users').then(r => setUsers(r.data.data.users)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const updateRole = async (userId, role) => {
    try {
      await api.patch(`/users/${userId}`, { role })
      setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x))
      toast.success('Role updated')
    } catch { toast.error('Failed to update role') }
  }

  const deleteUser = async (userId) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      await api.delete(`/users/${userId}`)
      setUsers(u => u.filter(x => x.id !== userId))
      toast.success('User deleted')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    members: users.filter(u => u.role === 'MEMBER').length,
  }

  return (
    <div className="page">
      <div className="topbar" style={{ margin: '-32px -32px 32px', padding: '0 32px' }}>
        <h1 className="topbar-title">Team</h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Members', value: stats.total, icon: Users, color: 'var(--primary)' },
          { label: 'Admins', value: stats.admins, icon: Shield, color: 'var(--warning)' },
          { label: 'Members', value: stats.members, icon: UserCheck, color: 'var(--success)' },
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

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
        <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search by name or email..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Users grid */}
      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map((u, i) => {
            const palette = AVATAR_COLORS[i % AVATAR_COLORS.length]
            const isSelf = u.id === user?.id
            return (
              <div key={u.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div className="avatar lg" style={{ background: palette.bg, color: palette.color, flexShrink: 0 }}>
                    {getInitials(u.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{u.name}</span>
                      {isSelf && <span style={{ fontSize: 10, background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>You</span>}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                    <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      Joined {format(new Date(u.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text2)' }}>
                  <span>{u._count?.assignedTasks || 0} tasks assigned</span>
                  <span>·</span>
                  <span>{u._count?.ownedProjects || 0} projects owned</span>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={u.role}
                    onChange={e => updateRole(u.id, e.target.value)}
                    disabled={isSelf}
                    className={`badge badge-${u.role.toLowerCase()}`}
                    style={{ border: 'none', cursor: isSelf ? 'default' : 'pointer', fontWeight: 600, fontSize: 11, borderRadius: 99 }}
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  {!isSelf && (
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto', fontSize: 12 }}
                      onClick={() => deleteUser(u.id)}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
