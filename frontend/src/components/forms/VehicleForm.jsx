import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { apiUrl } from "../../services/api"

const empty = {
  id: "",
  brand: "",
  model: "",
  year: 2024,
  category: "SUV",
  fuel: "Petrol",
  transmission: "Manual",
  color: "",
  price: "",
  stock: "",
  threshold: 2,
  description: "",
}

export default function VehicleForm({ initial, onSave }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(initial || empty)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState("")
  const [imageFile, setImageFile] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [previewUrl, setPreviewUrl] = useState("")
  const previewObjectUrl = useRef(null)
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  useEffect(() => {
    return () => {
      if (previewObjectUrl.current)
        URL.revokeObjectURL(previewObjectUrl.current)
    }
  }, [])

  const selectImage = (file) => {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current)

    previewObjectUrl.current = file ? URL.createObjectURL(file) : null
    setPreviewUrl(previewObjectUrl.current || "")
    setImageFile(file)
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    ;["id", "brand", "model", "color"].forEach((k) => {
      if (!String(form[k]).trim()) next[k] = "This field is required."
    })
    if (form.stock === "") next.stock = "Stock quantity is required."
    if (form.threshold === "")
      next.threshold = "Low-stock threshold is required."
    if (Number(form.price) <= 0) next.price = "Enter a valid listed price."
    if (
      !Number.isInteger(Number(form.year)) ||
      Number(form.year) < 1886 ||
      Number(form.year) > new Date().getFullYear() + 1
    )
      next.year = "Enter a valid manufacturing year."
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0)
      next.stock = "Stock must be a non-negative whole number."
    if (!Number.isInteger(Number(form.threshold)) || Number(form.threshold) < 0)
      next.threshold = "Threshold must be a non-negative whole number."
    if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0)
      next.price = "Enter a valid listed price."
    setErrors(next)
    if (Object.keys(next).length) return
    setSaving(true)
    setServerError("")
    try {
      await onSave({
        ...form,
        imageFile,
        removeImage,
        year: Number(form.year),
        price: Number(form.price),
        stock: Number(form.stock),
        threshold: Number(form.threshold),
      })
      navigate("/vehicles")
    } catch (error) {
      setServerError(error.message)
    } finally {
      setSaving(false)
    }
  }
  const field = (key, label, type = "text", props = {}) => (
    <div className="col-md-6">
      <label className="form-label" htmlFor={key}>
        {label} <span>*</span>
      </label>
      <input
        id={key}
        className={`form-control ${errors[key] ? "is-invalid" : ""}`}
        type={type}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        {...props}
      />
      {errors[key] && <div className="invalid-feedback">{errors[key]}</div>}
    </div>
  )
  return (
    <form onSubmit={submit} className="form-card">
      {serverError && (
        <div className="alert alert-danger m-3" role="alert">
          {serverError}
        </div>
      )}
      <div className="form-section">
        <h2>Vehicle identification</h2>
        <p>Core information used across inventory and sales.</p>
        <div className="row g-3">
          {field("id", "Vehicle ID", "text", { disabled: !!initial })}
          {field("brand", "Brand")}
          {field("model", "Model")}
          {field("year", "Manufacturing year", "number", {
            min: 1990,
            max: 2030,
          })}
        </div>
      </div>
      <div className="form-section">
        <h2>Specifications</h2>
        <div className="row g-3">
          <Select
            id="category"
            label="Category"
            value={form.category}
            onChange={(v) => set("category", v)}
            options={["SUV", "Compact SUV", "Sedan", "Hatchback", "MPV"]}
          />
          <Select
            id="fuel"
            label="Fuel type"
            value={form.fuel}
            onChange={(v) => set("fuel", v)}
            options={["Petrol", "Diesel", "Hybrid", "Electric", "CNG"]}
          />
          <Select
            id="transmission"
            label="Transmission"
            value={form.transmission}
            onChange={(v) => set("transmission", v)}
            options={["Manual", "Automatic"]}
          />
          {field("color", "Color")}
        </div>
      </div>
      <div className="form-section">
        <h2>Pricing and stock</h2>
        <div className="row g-3">
          {field("price", "Listed price (₹)", "number", { min: 0 })}
          {field("stock", "Stock quantity", "number", { min: 0 })}
          {field("threshold", "Low-stock threshold", "number", { min: 0 })}
          <div className="col-12">
            <label className="form-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className="form-control"
              rows="4"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
        </div>
        <div className="form-section">
          <h2>Vehicle image</h2>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label" htmlFor="vehicle-image">
                Vehicle Image
              </label>
              <input
                id="vehicle-image"
                className="form-control"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  selectImage(event.target.files?.[0] || null)
                  setRemoveImage(false)
                }}
              />
              <small className="text-muted">
                JPEG, PNG, or WebP; maximum file size 5 MB.
              </small>
            </div>
            {(previewUrl || (form.imageUrl && !removeImage)) && (
              <div className="col-12">
                <img
                  src={previewUrl || apiUrl(form.imageUrl)}
                  alt="Vehicle image preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 240,
                    objectFit: "contain",
                  }}
                />
              </div>
            )}
            {form.imageUrl && !removeImage && (
              <div className="col-12">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    selectImage(null)
                    setRemoveImage(true)
                  }}
                >
                  Remove current image
                </button>
              </div>
            )}
            {form.imageUrl && removeImage && (
              <div className="col-12">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setRemoveImage(false)}
                >
                  Keep current image
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="form-footer">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => navigate("/vehicles")}
        >
          Cancel
        </button>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save Vehicle"}
        </button>
      </div>
    </form>
  )
}

function Select({ id, label, value, onChange, options }) {
  return (
    <div className="col-md-6">
      <label className="form-label" htmlFor={id}>
        {label} <span>*</span>
      </label>
      <select
        id={id}
        className="form-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}
