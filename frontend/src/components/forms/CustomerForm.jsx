import { useId, useState } from "react"
import { useNavigate } from "react-router-dom"
import { today } from "../../utils/format"

export default function CustomerForm({ initial, onSave }) {
  const navigate = useNavigate()
  const generatedId = useId()
  const [form, setForm] = useState(
    initial || {
      id: `CU-${generatedId.replaceAll(":", "")}`,
      name: "",
      phone: "",
      email: "",
      address: "",
      registered: today(),
      status: "Active",
    },
  )
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState("")
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!form.name.trim()) next.name = "Full name is required."
    if (!/^[+\d][\d\s-]{8,}$/.test(form.phone))
      next.phone = "Enter a valid phone number."
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      next.email = "Enter a valid email address."
    if (!form.address.trim()) next.address = "Address is required."
    setErrors(next)
    if (!Object.keys(next).length) {
      setSaving(true)
      setServerError("")
      try {
        await onSave(form)
        navigate("/customers")
      } catch (error) {
        setServerError(error.message)
      } finally {
        setSaving(false)
      }
    }
  }
  const field = (key, label, type = "text") => (
    <div className="col-md-6">
      <label className="form-label" htmlFor={key}>
        {label} <span>*</span>
      </label>
      <input
        id={key}
        type={type}
        className={`form-control ${errors[key] ? "is-invalid" : ""}`}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        disabled={key === "id"}
      />
      {errors[key] && <div className="invalid-feedback">{errors[key]}</div>}
    </div>
  )
  return (
    <form className="form-card" onSubmit={submit}>
      {serverError && (
        <div className="alert alert-danger m-3" role="alert">
          {serverError}
        </div>
      )}
      <div className="form-section">
        <h2>Customer information</h2>
        <p>Contact details used for showroom transaction records.</p>
        <div className="row g-3">
          {field("id", "Customer ID")}
          {field("name", "Full name")}
          {field("phone", "Phone number", "tel")}
          {field("email", "Email address", "email")}
          <div className="col-12">
            <label className="form-label" htmlFor="address">
              Address <span>*</span>
            </label>
            <textarea
              id="address"
              rows="3"
              className={`form-control ${errors.address ? "is-invalid" : ""}`}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
            {errors.address && (
              <div className="invalid-feedback">{errors.address}</div>
            )}
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              className="form-select"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option>Active</option>
              <option>Archived</option>
            </select>
          </div>
        </div>
      </div>
      <div className="form-footer">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => navigate("/customers")}
        >
          Cancel
        </button>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save Customer"}
        </button>
      </div>
    </form>
  )
}
