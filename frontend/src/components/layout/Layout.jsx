import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, CheckSquare, Users, LogOut, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <Icon size={17} />
      {label}
    </NavLink>
  )
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={18} color="#fff" fill="#fff" />
          </div>
          <span className="sidebar-logo-text">TaskFlow</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu</div>
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/projects" icon={FolderKanban} label="Projects" />
          <NavItem to="/tasks" icon={CheckSquare} label="My Tasks" />
          {user?.role === 'ADMIN' && (
            <NavItem to="/team" icon={Users} label="Team" />
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card" onClick={handleLogout} title="Logout">
            <div className="avatar">{getInitials(user?.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div className="user-role">{user?.role?.toLowerCase()}</div>
            </div>
            <LogOut size={15} style={{ color: 'var(--text3)', flexShrink: 0 }} />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
