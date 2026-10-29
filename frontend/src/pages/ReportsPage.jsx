import { useMemo, useState } from "react"
import { Download, IndianRupee, PackageCheck, Warehouse } from "lucide-react"
import { useStore } from "../services/store"
import { currency, downloadCsv, shortDate } from "../utils/format"
import { PageHeader, StatusBadge } from "../components/common/UI"

export default function ReportsPage() {
  const store = useStore(),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [brand, setBrand] = useState(""),
    [status, setStatus] = useState("Completed")
  const rows = useMemo(
    () =>
      store.sales.filter(
        (s) =>
          (!from || s.date >= from) &&
          (!to || s.date <= to) &&
          (!status || s.status === status) &&
          (!brand ||
            (store.vehicles.find((v) => v.id === s.vehicleId)?.brand ||
              s.vehicleSnapshot?.brand) === brand),
      ),
    [store.sales, store.vehicles, from, to, brand, status],
  )
  const completedRows = rows.filter((s) => s.status === "Completed")
  const revenue = completedRows.reduce((a, s) => a + s.amount, 0),
    units = completedRows.reduce((a, s) => a + s.quantity, 0),
    inventoryValue = store.vehicles.reduce((a, v) => a + v.price * v.stock, 0)
  const brands = Object.entries(
      completedRows.reduce((a, s) => {
        const b =
          store.vehicles.find((v) => v.id === s.vehicleId)?.brand ||
          s.vehicleSnapshot?.brand ||
          "Unknown"
        return { ...a, [b]: (a[b] || 0) + s.amount }
      }, {}),
    ).sort((a, b) => b[1] - a[1]),
    max = Math.max(...brands.map((x) => x[1]), 1)
  const models = Object.entries(
    completedRows.reduce((a, s) => {
      const v = store.vehicles.find((v) => v.id === s.vehicleId),
        n = v
          ? `${v.brand} ${v.model}`
          : `${s.vehicleSnapshot?.brand || "Unknown"} ${s.vehicleSnapshot?.model || ""}`.trim()
      return { ...a, [n]: (a[n] || 0) + s.quantity }
    }, {}),
  ).sort((a, b) => b[1] - a[1])
  const exportRows = rows.map((sale) => {
    const vehicle =
      store.vehicles.find((item) => item.id === sale.vehicleId) ||
      sale.vehicleSnapshot
    const customer =
      store.customers.find((item) => item.id === sale.customerId) ||
      sale.customerSnapshot

    return {
      "Sale ID": sale.id,
      Date: shortDate(sale.date),
      Vehicle: vehicle?.model || "",
      Customer: customer?.name || customer?.fullName || "",
      Quantity: sale.quantity,
      "Amount (INR)": currency(sale.amount),
      Status: sale.status,
    }
  })
  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Filtered sales and inventory analysis from showroom records."
        actions={
          <button
            className="btn btn-primary"
            onClick={() => downloadCsv("autodesk-sales-report.csv", exportRows)}
            disabled={!rows.length}
          >
            <Download size={17} /> Export CSV
          </button>
        }
      />
      <section className="panel report-filters">
        <div>
          <label className="form-label" htmlFor="report-start">
            Start date
          </label>
          <input
            id="report-start"
            className="form-control"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="report-end">
            End date
          </label>
          <input
            id="report-end"
            className="form-control"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="report-brand">
            Brand
          </label>
          <select
            id="report-brand"
            className="form-select"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            <option value="">All brands</option>
            {[...new Set(store.vehicles.map((v) => v.brand))].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="report-status">
            Sales status
          </label>
          <select
            id="report-status"
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        </div>
      </section>
      <div className="metric-grid reports">
        <ReportMetric
          icon={IndianRupee}
          label="Revenue"
          value={currency(revenue)}
        />
        <ReportMetric icon={PackageCheck} label="Units sold" value={units} />
        <ReportMetric
          icon={Warehouse}
          label="Current inventory value"
          value={currency(inventoryValue)}
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel span-2">
          <div className="panel-head">
            <div>
              <h2>Sales by brand</h2>
              <p>Completed sale revenue in active filters</p>
            </div>
          </div>
          <div className="horizontal-bars">
            {brands.length ? (
              brands.map(([b, v]) => (
                <div key={b}>
                  <span>{b}</span>
                  <div>
                    <i style={{ width: `${(v / max) * 100}%` }} />
                  </div>
                  <strong>{currency(v)}</strong>
                </div>
              ))
            ) : (
              <p className="muted">No completed sales match these filters.</p>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Best-selling models</h2>
              <p>Completed units in active filters</p>
            </div>
          </div>
          {models.length ? (
            <ol className="rank-list">
              {models.map(([m, n]) => (
                <li key={m}>
                  <span>{m}</span>
                  <strong>
                    {n} unit{n !== 1 ? "s" : ""}
                  </strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">No completed sales match these filters.</p>
          )}
        </section>
        <section className="panel span-3">
          <div className="panel-head">
            <div>
              <h2>Low-stock report</h2>
              <p>Current inventory status</p>
            </div>
          </div>
          {store.vehicles.some((v) => v.stock <= v.threshold) ? (
            <div className="table-responsive">
              <table className="table data-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Brand / Model</th>
                    <th>Available</th>
                    <th>Threshold</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {store.vehicles
                    .filter((v) => v.stock <= v.threshold)
                    .map((v) => (
                      <tr key={v.id}>
                        <td>{v.id}</td>
                        <td>
                          <b>
                            {v.brand} {v.model}
                          </b>
                        </td>
                        <td>{v.stock}</td>
                        <td>{v.threshold}</td>
                        <td>
                          <StatusBadge
                            value={v.stock ? "Low stock" : "Out of stock"}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">
              No vehicles are at or below their low-stock threshold.
            </p>
          )}
        </section>
      </div>
    </>
  )
}
function ReportMetric({ icon: Icon, label, value }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>Based on displayed filters</small>
      </div>
    </div>
  )
}
