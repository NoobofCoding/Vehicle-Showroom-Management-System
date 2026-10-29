import { useEffect, useState } from "react"

import { PageHeader } from "../components/common/UI"

import { apiRequest } from "../services/api"

export default function UserManagementPage() {
  const [users, setUsers] = useState([])

  const [form, setForm] = useState({ name: "", email: "", password: "" })

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState("")

  const [success, setSuccess] = useState("")

  useEffect(() => {
    let active = true

    apiRequest("/users")
      .then(({ data }) => {
        if (active) setUsers(data)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const submit = async (event) => {
    event.preventDefault()

    setSaving(true)

    setError("")

    setSuccess("")

    try {
      const { data } = await apiRequest("/users", {
        method: "POST",

        body: form,
      })

      setUsers((current) =>
        [...current, data].sort((a, b) => a.name.localeCompare(b.name)),
      )

      setForm({ name: "", email: "", password: "" })

      setSuccess("Staff account created.")
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="User Management"
        description="Create and view showroom staff accounts."
      />
      <div className="settings-grid">
        <form className="form-card" onSubmit={submit}>
          <div className="form-section">
            <h2>Create staff account</h2>
            <p>New staff can sign in and use showroom operations.</p>
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success" role="status">
                {success}
              </div>
            )}
            <div className="mb-3">
              <label className="form-label" htmlFor="staff-name">
                Full name
              </label>
              <input
                id="staff-name"
                className="form-control"
                value={form.name}
                maxLength={120}
                autoComplete="name"
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="staff-email">
                Email address
              </label>
              <input
                id="staff-email"
                className="form-control"
                type="email"
                value={form.email}
                maxLength={254}
                autoComplete="email"
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="staff-password">
                Initial password
              </label>
              <input
                id="staff-password"
                className="form-control"
                type="password"
                value={form.password}
                minLength={12}
                maxLength={200}
                autoComplete="new-password"
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                required
              />
              <small className="text-muted">
                Use at least 12 characters. Passwords are stored as hashes.
              </small>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="staff-role">
                Role
              </label>
              <select
                id="staff-role"
                className="form-select"
                value="Staff"
                disabled
              >
                <option value="Staff">Staff</option>
              </select>
            </div>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Creating…" : "Create Staff Account"}
            </button>
          </div>
        </form>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Showroom users</h2>
              <p>{users.length} accounts</p>
            </div>
          </div>
          {loading ? (
            <div className="app-loading" role="status">
              Loading users…
            </div>
          ) : users.length ? (
            <div className="table-responsive">
              <table className="table data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>{user.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">No staff accounts are available.</p>
          )}
        </section>
      </div>
    </>
  )
}
