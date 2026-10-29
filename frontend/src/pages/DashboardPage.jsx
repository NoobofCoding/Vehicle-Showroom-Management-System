import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  Boxes,
  CarFront,
  CircleDollarSign,
  ShoppingCart,
  UserPlus,
} from "lucide-react"
import { useStore } from "../services/store"
import { currency, shortDate } from "../utils/format"
import { PageHeader, StatusBadge } from "../components/common/UI"

export default function DashboardPage() {
  const { vehicles, customers, sales } = useStore()
  const [range, setRange] = useState("all")
  const latestSaleDate = sales.reduce(
    (latest, sale) => (sale.date > latest ? sale.date : latest),
    "",
  )
  const completed = useMemo(
    () =>
      sales.filter((sale) => {
        if (sale.status !== "Completed" || range === "all" || !latestSaleDate)
          return sale.status === "Completed"
        const latest = new Date(`${latestSaleDate}T00:00:00`)
        const saleDate = new Date(`${sale.date}T00:00:00`)
        const days = range === "30" ? 30 : 90
        return saleDate >= new Date(latest.getTime() - days * 86400000)
      }),
    [sales, range, latestSaleDate],
  )
  const revenue = completed.reduce((sum, s) => sum + s.amount, 0)
  const low = vehicles.filter((v) => v.stock <= v.threshold)
  const brandTotals = Object.entries(
    vehicles.reduce(
      (a, v) => ({ ...a, [v.brand]: (a[v.brand] || 0) + v.stock }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1])
  const max = Math.max(...brandTotals.map(([, n]) => n))
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={new Intl.DateTimeFormat("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date())}
        actions={
          <div className="quick-actions">
            <Link className="btn btn-primary" to="/sales/new">
              <ShoppingCart size={17} /> Record sale
            </Link>
            <Link className="btn btn-outline-secondary" to="/vehicles/new">
              <CarFront size={17} /> Add vehicle
            </Link>
            <Link className="btn btn-outline-secondary" to="/customers/new">
              <UserPlus size={17} /> Add customer
            </Link>
          </div>
        }
      />
      <div className="metric-grid">
        <Metric
          icon={Boxes}
          label="Inventory units"
          value={vehicles.reduce((sum, v) => sum + v.stock, 0)}
          note="Available across all records"
        />
        <Metric
          icon={CarFront}
          label="Vehicle records"
          value={vehicles.length}
          note={`${new Set(vehicles.map((v) => v.brand)).size} represented brands`}
        />
        <Metric
          icon={ShoppingCart}
          label="Completed sales"
          value={sales.filter((sale) => sale.status === "Completed").length}
          note={`${sales.filter((sale) => sale.status === "Completed").reduce((sum, sale) => sum + sale.quantity, 0)} units sold`}
        />
        <Metric
          icon={CircleDollarSign}
          label="Gross sales revenue"
          value={currency(revenue)}
          note="Completed sales, after discount"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel span-2">
          <div className="panel-head">
            <div>
              <h2>Sales trend</h2>
              <p>Completed sales relative to the most recent sale date</p>
            </div>
            <select
              className="form-select form-select-sm range-select"
              aria-label="Sales trend range"
              value={range}
              onChange={(event) => setRange(event.target.value)}
            >
              <option value="all">All records</option>
              <option value="90">Last 90 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>
          {completed.length ? (
            <SalesChart sales={completed} />
          ) : (
            <p className="muted">No completed sales in this date range.</p>
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Low-stock alerts</h2>
              <p>At or below configured threshold</p>
            </div>
            <span className="count-chip">{low.length}</span>
          </div>
          <div className="alert-list">
            {low.map((v) => (
              <Link to={`/vehicles/${v.id}`} key={v.id}>
                <span>
                  <strong>
                    {v.brand} {v.model}
                  </strong>
                  <small>
                    {v.id} · Threshold {v.threshold}
                  </small>
                </span>
                <b>{v.stock} left</b>
              </Link>
            ))}
          </div>
        </section>
        <section className="panel span-2">
          <div className="panel-head">
            <div>
              <h2>Recent sales</h2>
              <p>Latest transactions</p>
            </div>
            <Link to="/sales" className="text-link">
              View all <ArrowRight size={15} />
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table data-table">
              <thead>
                <tr>
                  <th>Sale ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 5).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/sales/${s.id}`}>{s.id}</Link>
                    </td>
                    <td>{shortDate(s.date)}</td>
                    <td>
                      {s.customerSnapshot?.fullName ||
                        customers.find((c) => c.id === s.customerId)?.name}
                    </td>
                    <td>
                      {s.vehicleSnapshot?.model ||
                        vehicles.find((v) => v.id === s.vehicleId)?.model}
                    </td>
                    <td>{currency(s.amount)}</td>
                    <td>
                      <StatusBadge value={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Inventory by brand</h2>
              <p>Available units</p>
            </div>
          </div>
          <div className="brand-bars">
            {brandTotals.map(([brand, total]) => (
              <div key={brand}>
                <span>
                  <b>{brand}</b>
                  <small>{total}</small>
                </span>
                <div>
                  <i style={{ width: `${(total / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

function Metric({ icon: Icon, label, value, note }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </div>
  )
}
function SalesChart({ sales }) {
  const values = [...sales]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => s.amount)
  const max = Math.max(...values, 1)
  return (
    <div className="sales-chart">
      <div className="chart-y">
        <span>{currency(max)}</span>
        <span>{currency(max / 2)}</span>
        <span>₹0</span>
      </div>
      <div className="chart-bars">
        {values.map((v, i) => (
          <div key={i}>
            <span
              style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
              title={currency(v)}
            />
            <small>
              {new Date(
                `${[...sales].sort((a, b) => a.date.localeCompare(b.date))[i].date}T00:00:00`,
              ).toLocaleDateString("en-IN", { month: "short" })}
            </small>
          </div>
        ))}
      </div>
    </div>
  )
}
