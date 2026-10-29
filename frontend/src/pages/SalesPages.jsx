import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Ban, Eye, Plus, Printer, RotateCcw } from "lucide-react"
import { useStore } from "../services/store"
import { currency, shortDate, today } from "../utils/format"
import {
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Pagination,
  SearchBox,
  StatusBadge,
} from "../components/common/UI"

export function SalesListPage() {
  const store = useStore(),
    navigate = useNavigate(),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(1),
    [cancel, setCancel] = useState(null),
    [actionError, setActionError] = useState("")
  const rows = useMemo(
      () =>
        store.sales.filter((s) => {
          const customer =
              store.customers.find((c) => c.id === s.customerId)?.name || "",
            vehicle = store.vehicles.find((v) => v.id === s.vehicleId),
            text =
              `${s.id} ${customer} ${vehicle?.brand} ${vehicle?.model}`.toLowerCase()
          return (
            text.includes(query.toLowerCase()) &&
            (!status || s.status === status) &&
            (!from || s.date >= from) &&
            (!to || s.date <= to)
          )
        }),
      [store.sales, store.customers, store.vehicles, query, status, from, to],
    ),
    per = 6,
    pages = Math.max(1, Math.ceil(rows.length / per)),
    shown = rows.slice((page - 1) * per, page * per)
  const clear = () => {
    setQuery("")
    setStatus("")
    setFrom("")
    setTo("")
  }
  return (
    <>
      <PageHeader
        title="Sales"
        description={`${store.sales.length} transaction records`}
        actions={
          <Link className="btn btn-primary" to="/sales/new">
            <Plus size={17} /> Record New Sale
          </Link>
        }
      />
      <section className="panel">
        <div className="filters sales-filters">
          <SearchBox
            value={query}
            onChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            placeholder="Search sale, customer, or vehicle"
          />
          <input
            className="form-control"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value)
              setPage(1)
            }}
            aria-label="Start date"
          />
          <input
            className="form-control"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value)
              setPage(1)
            }}
            aria-label="End date"
          />
          <select
            className="form-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All statuses</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
          <button
            className="btn btn-light"
            onClick={() => {
              clear()
              setPage(1)
            }}
          >
            <RotateCcw size={16} /> Clear
          </button>
        </div>
        {actionError && (
          <div className="alert alert-danger" role="alert">
            {actionError}
          </div>
        )}
        {shown.length ? (
          <div className="table-responsive">
            <table className="table data-table">
              <thead>
                <tr>
                  <th>Sale</th>
                  <th>Date</th>
                  <th>Customer / Vehicle</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Discount</th>
                  <th>Final amount</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => {
                  const c = store.customers.find((c) => c.id === s.customerId),
                    v = store.vehicles.find((v) => v.id === s.vehicleId),
                    customer = s.customerSnapshot || c,
                    vehicle = s.vehicleSnapshot || v
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.id}</strong>
                      </td>
                      <td>{shortDate(s.date)}</td>
                      <td>
                        <b>{customer?.fullName || customer?.name}</b>
                        <small>
                          {vehicle?.brand} {vehicle?.model}
                        </small>
                      </td>
                      <td>{s.quantity}</td>
                      <td>{currency(s.unitPrice)}</td>
                      <td>{currency(s.discount)}</td>
                      <td>
                        <strong>{currency(s.amount)}</strong>
                      </td>
                      <td>
                        <StatusBadge value={s.status} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link
                            to={`/sales/${s.id}`}
                            aria-label={`View sale ${s.id}`}
                          >
                            <Eye size={17} />
                          </Link>
                          <button
                            onClick={() => navigate(`/sales/${s.id}`)}
                            aria-label={`Open invoice ${s.id}`}
                          >
                            <Printer size={17} />
                          </button>
                          {s.status === "Completed" && (
                            <button
                              className="danger"
                              onClick={() => setCancel(s)}
                              aria-label={`Cancel sale ${s.id}`}
                            >
                              <Ban size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
        <Pagination page={page} pages={pages} onChange={setPage} />
      </section>
      <ConfirmDialog
        open={!!cancel}
        title="Cancel this sale?"
        message="The transaction will be marked cancelled and its quantity restored to available stock."
        confirmLabel="Cancel Sale"
        danger
        onClose={() => setCancel(null)}
        onConfirm={async () => {
          try {
            await store.cancelSale(cancel.id)
            setCancel(null)
            setActionError("")
          } catch (error) {
            setActionError(error.message)
          }
        }}
      />
    </>
  )
}

export function CreateSalePage() {
  const store = useStore(),
    navigate = useNavigate(),
    [form, setForm] = useState({
      vehicleId: "",
      customerId: "",
      quantity: 1,
      unitPrice: "",
      discount: 0,
      date: today(),
    }),
    [error, setError] = useState(""),
    [done, setDone] = useState(null),
    [saving, setSaving] = useState(false)
  const vehicle = store.vehicles.find((v) => v.id === form.vehicleId),
    amount = Math.max(
      0,
      Number(form.quantity) * Number(form.unitPrice || 0) -
        Number(form.discount || 0),
    )
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const chooseVehicle = (id) => {
    const v = store.vehicles.find((x) => x.id === id)
    setForm((f) => ({ ...f, vehicleId: id, unitPrice: v?.price || "" }))
    setError("")
  }
  const submit = async (e) => {
    e.preventDefault()
    if (!form.vehicleId || !form.customerId)
      return setError("Select both a vehicle and a customer.")
    if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 1)
      return setError("Quantity must be a positive whole number.")
    if (!vehicle || Number(form.quantity) > vehicle.stock)
      return setError(`Only ${vehicle?.stock || 0} unit(s) are available.`)
    if (Number(form.unitPrice) <= 0 || Number(form.discount) < 0 || amount <= 0)
      return setError("Enter a positive selling price and a valid discount.")
    setSaving(true)
    setError("")
    try {
      const sale = await store.recordSale({
        ...form,
        quantity: Number(form.quantity),
        unitPrice: Number(form.unitPrice),
        discount: Number(form.discount),
      })
      setDone(sale)
    } catch (error) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }
  if (done)
    return (
      <>
        <PageHeader
          title="Sale recorded"
          description="The sale was saved and inventory was updated."
        />
        <section className="success-card">
          <div className="success-check">✓</div>
          <h2>{done.id}</h2>
          <p>
            Final sale amount: <strong>{currency(done.amount)}</strong>
          </p>
          <div>
            <Link className="btn btn-primary" to={`/sales/${done.id}`}>
              View Sale Details
            </Link>
            <Link className="btn btn-outline-secondary" to="/sales/new">
              Record Another Sale
            </Link>
          </div>
        </section>
      </>
    )
  return (
    <>
      <PageHeader
        title="Record New Sale"
        description="Record a showroom transaction and update available inventory."
      />
      <form className="sale-layout" onSubmit={submit}>
        <div className="form-card">
          <div className="form-section">
            <h2>1. Vehicle selection</h2>
            <label className="form-label" htmlFor="vehicle">
              Vehicle <span>*</span>
            </label>
            <select
              id="vehicle"
              className="form-select"
              value={form.vehicleId}
              onChange={(e) => chooseVehicle(e.target.value)}
            >
              <option value="">Select an available vehicle</option>
              {store.vehicles
                .filter((v) => v.stock > 0)
                .map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.id} · {v.brand} {v.model}
                  </option>
                ))}
            </select>
            {vehicle && (
              <div className="selection-note">
                <span>
                  Listed price <strong>{currency(vehicle.price)}</strong>
                </span>
                <span>
                  Available stock <strong>{vehicle.stock} units</strong>
                </span>
              </div>
            )}
          </div>
          <div className="form-section">
            <h2>2. Customer selection</h2>
            <label className="form-label" htmlFor="customer">
              Customer <span>*</span>
            </label>
            <select
              id="customer"
              className="form-select"
              value={form.customerId}
              onChange={(e) => set("customerId", e.target.value)}
            >
              <option value="">Select a customer</option>
              {store.customers
                .filter((c) => c.status === "Active")
                .map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.id} · {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-section">
            <h2>3. Transaction details</h2>
            <div className="row g-3">
              <Field
                id="quantity"
                label="Quantity"
                type="number"
                value={form.quantity}
                onChange={(v) => set("quantity", v)}
                min="1"
              />
              <Field
                id="unitPrice"
                label="Unit selling price (₹)"
                type="number"
                value={form.unitPrice}
                onChange={(v) => set("unitPrice", v)}
                min="1"
              />
              <Field
                id="discount"
                label="Total discount (₹)"
                type="number"
                value={form.discount}
                onChange={(v) => set("discount", v)}
                min="0"
              />
              <Field
                id="date"
                label="Sale date"
                type="date"
                value={form.date}
                onChange={(v) => set("date", v)}
              />
            </div>
          </div>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <div className="form-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate("/sales")}
            >
              Cancel
            </button>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Recording…" : "Confirm Sale"}
            </button>
          </div>
        </div>
        <aside className="transaction-summary">
          <span>TRANSACTION SUMMARY</span>
          <h2>
            {vehicle
              ? `${vehicle.brand} ${vehicle.model}`
              : "No vehicle selected"}
          </h2>
          <dl>
            <div>
              <dt>Quantity</dt>
              <dd>{form.quantity || 0}</dd>
            </div>
            <div>
              <dt>Unit selling price</dt>
              <dd>{currency(form.unitPrice)}</dd>
            </div>
            <div>
              <dt>Listed price</dt>
              <dd>{vehicle ? currency(vehicle.price) : "Not selected"}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>- {currency(form.discount)}</dd>
            </div>
          </dl>
          <div className="summary-total">
            <span>Final amount</span>
            <strong>{currency(amount)}</strong>
          </div>
          <small>
            The server calculates the saved amount from the sale values.
          </small>
        </aside>
      </form>
    </>
  )
}
function Field({ id, label, onChange, ...props }) {
  return (
    <div className="col-md-6">
      <label className="form-label" htmlFor={id}>
        {label} <span>*</span>
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

export function SaleDetailsPage() {
  const { id } = useParams(),
    store = useStore(),
    sale = store.sales.find((s) => s.id === id),
    navigate = useNavigate()
  if (!sale) return <EmptyState title="Sale not found" />
  const customer =
      sale.customerSnapshot ||
      store.customers.find((c) => c.id === sale.customerId),
    vehicle =
      sale.vehicleSnapshot ||
      store.vehicles.find((v) => v.id === sale.vehicleId),
    c = { ...customer, name: customer?.fullName || customer?.name },
    v = {
      ...vehicle,
      id: vehicle?.vehicleId || vehicle?.id,
      year: vehicle?.manufacturingYear || vehicle?.year,
      fuel: vehicle?.fuelType || vehicle?.fuel,
    }
  return (
    <>
      <PageHeader
        title="Sale Details"
        description={`Transaction ${sale.id}`}
        actions={
          <div className="invoice-actions">
            <button
              className="btn btn-outline-secondary"
              onClick={() => navigate("/sales")}
            >
              <ArrowLeft size={17} /> Back to Sales
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={17} /> Print Invoice
            </button>
          </div>
        }
      />
      <article className="invoice">
        <header>
          <div>
            <span className="invoice-brand">AUTODESK</span>
            <p>Vehicle Showroom · Sale invoice</p>
          </div>
          <div>
            <h2>SALE RECORD</h2>
            <strong>{sale.id}</strong>
          </div>
        </header>
        <div className="invoice-meta">
          <div>
            <span>Sale date</span>
            <strong>{shortDate(sale.date)}</strong>
          </div>
          <div>
            <span>Status</span>
            <StatusBadge value={sale.status} />
          </div>
        </div>
        <div className="invoice-parties">
          <section>
            <span>CUSTOMER</span>
            <h3>{c?.name}</h3>
            <p>
              {c?.phone}
              <br />
              {c?.email}
              <br />
              {c?.address}
            </p>
          </section>
          <section>
            <span>VEHICLE</span>
            <h3>
              {v?.brand} {v?.model}
            </h3>
            <p>
              {v?.id}
              <br />
              {v?.year} · {v?.fuel} · {v?.transmission}
              <br />
              {v?.color}
            </p>
          </section>
        </div>
        <table className="table invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit selling price</th>
              <th>Discount</th>
              <th>Final amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {v?.brand} {v?.model}
                <small>{v?.id}</small>
              </td>
              <td>{sale.quantity}</td>
              <td>{currency(sale.unitPrice)}</td>
              <td>{currency(sale.discount)}</td>
              <td>
                <strong>{currency(sale.amount)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="invoice-total">
          <span>Final sale amount</span>
          <strong>{currency(sale.amount)}</strong>
        </div>
        <footer>
          This invoice documents a sale record. It does not confirm payment
          processing.
        </footer>
      </article>
    </>
  )
}
