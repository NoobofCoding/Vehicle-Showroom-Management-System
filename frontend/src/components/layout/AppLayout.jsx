import { useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  FileText,
  Gauge,
  LogOut,
  Menu,
  PackagePlus,
  Search,
  Settings,
  ShoppingCart,
  Users,
  UserRoundCog,
  X,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useStore } from "../../services/store"

const links = [
  ["/", "Dashboard", Gauge],
  ["/vehicles", "Vehicle Inventory", Boxes],
  ["/customers", "Customers", Users],
  ["/sales", "Sales", ShoppingCart],
  ["/stock-adjustments", "Stock Adjustments", PackagePlus],
  ["/reports", "Reports & Analytics", BarChart3],
  ["/settings", "Settings", Settings],
  ["/privacy-policy", "Privacy Policy", FileText],
]

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">A</span>
      <span>
        Auto<strong>Desk</strong>
      </span>
    </div>
  )
}

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [profile, setProfile] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const visibleLinks =
    user?.role === "Manager"
      ? [...links, ["/users", "User Management", UserRoundCog]]
      : links
  const store = useStore()
  const lowStock =
    store?.vehicles.filter((vehicle) => vehicle.stock <= vehicle.threshold) ||
    []
  const signOut = async () => {
    await logout()
    navigate("/login", { replace: true })
  }
  const title =
    visibleLinks.find(([path]) =>
      path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(path),
    )?.[1] || "AutoDesk"
  return (
    <div className="app-shell">
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <nav aria-label="Primary navigation">
          {visibleLinks.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="sidebar-logout" onClick={signOut}>
          <LogOut size={19} /> Logout
        </button>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-toggle"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <div>
              <span className="eyebrow">SHOWROOM OPERATIONS</span>
              <h2>{title}</h2>
            </div>
          </div>
          <div className="topbar-actions">
            <form
              className="topbar-search"
              onSubmit={(event) => {
                event.preventDefault()
                const search = new FormData(event.currentTarget).get("search")
                if (search)
                  navigate(`/vehicles?search=${encodeURIComponent(search)}`)
              }}
            >
              <Search size={17} />
              <input
                name="search"
                placeholder="Search vehicle inventory"
                aria-label="Search vehicle inventory"
              />
            </form>
            <div className="menu-wrap">
              <button
                className="icon-button notification-button"
                onClick={() => setNotifications(!notifications)}
                aria-label={`Notifications, ${lowStock.length} low-stock alerts`}
              >
                <Bell size={20} />
                {lowStock.length > 0 && <span />}
              </button>
              {notifications && (
                <div className="dropdown-panel notification-panel">
                  <div className="dropdown-title">
                    Low-stock alerts <small>{lowStock.length}</small>
                  </div>
                  {lowStock.length ? (
                    lowStock.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        onClick={() => {
                          setNotifications(false)
                          navigate(`/vehicles/${vehicle.id}`)
                        }}
                      >
                        <strong>
                          {vehicle.brand} {vehicle.model}
                        </strong>
                        <span>
                          {vehicle.stock} available · Threshold{" "}
                          {vehicle.threshold}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="notification-empty">No low-stock vehicles.</p>
                  )}
                </div>
              )}
            </div>
            <div className="menu-wrap">
              <button
                className="profile-button"
                onClick={() => setProfile(!profile)}
              >
                <span className="avatar">
                  {(user?.name || "ST")
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <span className="profile-copy">
                  <strong>{user?.name}</strong>
                  <small>{user?.role}</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {profile && (
                <div className="dropdown-panel profile-panel">
                  <button onClick={() => navigate("/settings")}>
                    <Settings size={16} /> Profile settings
                  </button>
                  <button onClick={signOut}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main>
          {store?.loading ? (
            <div className="app-loading" role="status">
              Loading showroom records…
            </div>
          ) : store?.error ? (
            <div className="alert alert-danger" role="alert">
              <strong>Could not load showroom records.</strong>{" "}
              {store.error.message}
              <button
                className="btn btn-outline-secondary btn-sm ms-3"
                onClick={store.refresh}
              >
                Retry
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        <footer>
          AutoDesk showroom operations <span>•</span>{" "}
          <NavLink to="/privacy-policy">Privacy policy</NavLink>
        </footer>
      </div>
    </div>
  )
}
