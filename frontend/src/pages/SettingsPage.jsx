import { useId, useState } from "react"
import { Bell, Building2, LockKeyhole, UserRound } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { PageHeader } from "../components/common/UI"
import { useStore } from "../services/store"
import { useAuth } from "../contexts/AuthContext"
import { apiRequest } from "../services/api"

export default function SettingsPage() {
  const store = useStore(),
    { refreshUser, logout } = useAuth(),
    navigate = useNavigate()
  const initial = () => ({
    name: store.settings.staffName,
    email: store.settings.staffEmail,
    showroom: store.settings.showroomName,
    currency: store.settings.currency,
    threshold: store.settings.lowStockThreshold,
    emailAlerts: store.settings.emailAlerts,
    stockAlerts: store.settings.stockAlerts,
  })
  const [saved, setSaved] = useState(false),
    [form, setForm] = useState(initial),
    [password, setPassword] = useState({ current: "", next: "", confirm: "" }),
    [error, setError] = useState(""),
    [passwordError, setPasswordError] = useState(""),
    [passwordSaved, setPasswordSaved] = useState(false),
    [saving, setSaving] = useState(false)
  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.showroom.trim())
      return setError("Complete all required profile and showroom fields.")
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      return setError("Enter a valid staff email address.")
    if (!Number.isInteger(Number(form.threshold)) || Number(form.threshold) < 0)
      return setError(
        "The stock threshold must be a non-negative whole number.",
      )
    setSaving(true)
    setError("")
    try {
      await store.saveSettings({
        staffName: form.name,
        staffEmail: form.email,
        showroomName: form.showroom,
        currency: form.currency,
        lowStockThreshold: Number(form.threshold),
        emailAlerts: form.emailAlerts,
        stockAlerts: form.stockAlerts,
      })
      await refreshUser()
      setSaved(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }
  const change = async (e) => {
    e.preventDefault()
    if (password.next.length < 12)
      return setPasswordError(
        "New password must contain at least 12 characters.",
      )
    if (password.next !== password.confirm)
      return setPasswordError("New password confirmation does not match.")
    setPasswordError("")
    setPasswordSaved(false)
    try {
      await apiRequest("/auth/password", {
        method: "PATCH",
        body: { currentPassword: password.current, newPassword: password.next },
      })
      setPassword({ current: "", next: "", confirm: "" })
      setPasswordSaved(true)
      await logout()
      navigate("/login", { replace: true })
    } catch (requestError) {
      setPasswordError(requestError.message)
    }
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const cancel = () => {
    setForm(initial())
    setError("")
    setSaved(false)
  }
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage staff profile, showroom display, and notification preferences."
      />
      <div className="settings-grid">
        <form className="form-card" onSubmit={save}>
          <SettingTitle
            icon={UserRound}
            title="Staff profile"
            text="Information shown in the application header."
          />
          <div className="form-section compact">
            <div className="row g-3">
              <Input
                label="Full name"
                value={form.name}
                onChange={(v) => set("name", v)}
              />
              <Input
                label="Email address"
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
              />
            </div>
          </div>
          <SettingTitle
            icon={Building2}
            title="Showroom preferences"
            text="Display and stock defaults."
          />
          <div className="form-section compact">
            <div className="row g-3">
              <Input
                label="Showroom name"
                value={form.showroom}
                onChange={(v) => set("showroom", v)}
              />
              <div className="col-md-6">
                <label className="form-label" htmlFor="currency">
                  Currency
                </label>
                <select
                  id="currency"
                  className="form-select"
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value)}
                >
                  <option value="INR">INR · Indian Rupee</option>
                </select>
              </div>
              <Input
                label="Default low-stock threshold"
                type="number"
                min="0"
                value={form.threshold}
                onChange={(v) => set("threshold", v)}
              />
            </div>
          </div>
          <SettingTitle
            icon={Bell}
            title="Notifications"
            text="Choose which notices are surfaced."
          />
          <div className="form-section compact checks">
            <label>
              <input
                type="checkbox"
                checked={form.stockAlerts}
                onChange={(e) => set("stockAlerts", e.target.checked)}
              />{" "}
              Low-stock alerts
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.emailAlerts}
                onChange={(e) => set("emailAlerts", e.target.checked)}
              />{" "}
              Email notification preference
            </label>
          </div>
          {error && (
            <div className="alert alert-danger m-3" role="alert">
              {error}
            </div>
          )}
          {saved && (
            <div className="alert alert-success m-3" role="status">
              Settings saved.
            </div>
          )}
          <div className="form-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={cancel}
            >
              Cancel
            </button>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
        <form className="panel password-panel" onSubmit={change}>
          <SettingTitle
            icon={LockKeyhole}
            title="Change password"
            text="Update the password for your staff account."
          />
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={password.current}
            onChange={(v) => setPassword({ ...password, current: v })}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password.next}
            onChange={(v) => setPassword({ ...password, next: v })}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={password.confirm}
            onChange={(v) => setPassword({ ...password, confirm: v })}
          />
          {passwordError && (
            <div className="alert alert-danger" role="alert">
              {passwordError}
            </div>
          )}
          {passwordSaved && (
            <div className="alert alert-success" role="status">
              Password changed. Sign in again using your new password.
            </div>
          )}
          <button className="btn btn-outline-secondary w-100">
            Update Password
          </button>
        </form>
      </div>
    </>
  )
}
function SettingTitle({ icon: Icon, title, text }) {
  return (
    <div className="setting-title">
      <span>
        <Icon size={19} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  )
}
function Input({ label, onChange, ...props }) {
  const id = useId()

  return (
    <div className="col-md-6 setting-input">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="form-control"
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </div>
  )
}
