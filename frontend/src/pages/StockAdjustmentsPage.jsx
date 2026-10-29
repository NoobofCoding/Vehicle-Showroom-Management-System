import { useState } from "react"

import { Plus } from "lucide-react"

import { useStore } from "../services/store"

import { shortDate } from "../utils/format"

import { ConfirmDialog, EmptyState, PageHeader } from "../components/common/UI"

export default function StockAdjustmentsPage() {
  const store = useStore()

  const [form, setForm] = useState({ vehicleId: "", change: 1, reason: "" })

  const [confirm, setConfirm] = useState(false)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState("")

  const vehicle = store.vehicles.find((item) => item.id === form.vehicleId)

  const change = Number(form.change)

  const next = vehicle ? vehicle.stock + change : 0

  const prepare = (event) => {
    event.preventDefault()

    if (!vehicle || !form.reason.trim())
      return setError("Select a vehicle and provide a reason.")

    if (!Number.isInteger(change) || change === 0 || next < 0) {
      return setError(
        "Enter a non-zero whole number that does not reduce stock below zero.",
      )
    }

    setError("")

    setConfirm(true)
  }

  const save = async () => {
    setSaving(true)

    setError("")

    try {
      await store.adjustStock(form.vehicleId, change, form.reason)

      setForm({ vehicleId: "", change: 1, reason: "" })

      setConfirm(false)
    } catch (requestError) {
      setConfirm(false)

      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Stock Adjustments"
        description="Review and record manual changes to available inventory."
      />
      <div className="detail-grid stock-layout">
        <form className="panel" onSubmit={prepare}>
          <div className="panel-head">
            <div>
              <h2>Record adjustment</h2>
              <p>Positive values add stock; negative values reduce it.</p>
            </div>
            <Plus size={20} />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="adj-vehicle">
              Vehicle <span>*</span>
            </label>
            <select
              id="adj-vehicle"
              className="form-select"
              value={form.vehicleId}
              onChange={(event) =>
                setForm({ ...form, vehicleId: event.target.value })
              }
              required
            >
              <option value="">Select vehicle</option>
              {store.vehicles.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.id} · {item.brand} {item.model}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="change">
              Quantity change <span>*</span>
            </label>
            <input
              id="change"
              className="form-control"
              type="number"
              step="1"
              value={form.change}
              onChange={(event) =>
                setForm({ ...form, change: event.target.value })
              }
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="reason">
              Reason <span>*</span>
            </label>
            <textarea
              id="reason"
              className="form-control"
              rows="3"
              value={form.reason}
              onChange={(event) =>
                setForm({ ...form, reason: event.target.value })
              }
              required
            />
          </div>
          {vehicle && (
            <div className="adjust-preview">
              <span>
                Current: <strong>{vehicle.stock}</strong>
              </span>
              <span>
                New: <strong>{next}</strong>
              </span>
            </div>
          )}
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <button className="btn btn-primary w-100">Review Adjustment</button>
        </form>
        <section className="panel span-adjust">
          <div className="panel-head">
            <div>
              <h2>Adjustment history</h2>
              <p>Most recent changes first</p>
            </div>
          </div>
          {store.adjustments.length ? (
            <div className="table-responsive">
              <table className="table data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Vehicle</th>
                    <th>Previous</th>
                    <th>Change</th>
                    <th>New</th>
                    <th>Reason</th>
                    <th>Staff</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {store.adjustments.map((adjustment) => (
                    <tr key={adjustment.id}>
                      <td>
                        <strong>{adjustment.id}</strong>
                      </td>
                      <td>
                        {adjustment.vehicleId}
                        <small>
                          {
                            store.vehicles.find(
                              (item) => item.id === adjustment.vehicleId,
                            )?.model
                          }
                        </small>
                      </td>
                      <td>{adjustment.previous}</td>
                      <td>
                        <b
                          className={
                            adjustment.change > 0 ? "positive" : "negative"
                          }
                        >
                          {adjustment.change > 0 ? "+" : ""}
                          {adjustment.change}
                        </b>
                      </td>
                      <td>{adjustment.current}</td>
                      <td>{adjustment.reason}</td>
                      <td>{adjustment.staff}</td>
                      <td>{shortDate(adjustment.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No stock adjustments"
              message="Recorded inventory changes will appear here."
            />
          )}
        </section>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Save stock adjustment?"
        message={
          vehicle
            ? `${vehicle.brand} ${vehicle.model} stock will change from ${vehicle.stock} to ${next}.`
            : ""
        }
        confirmLabel={saving ? "Saving…" : "Save Adjustment"}
        onClose={() => setConfirm(false)}
        onConfirm={save}
      />
    </>
  )
}
