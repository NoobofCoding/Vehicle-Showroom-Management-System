import { useMemo, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Archive, ArrowLeft, Edit3, Eye, Plus, RotateCcw } from "lucide-react"
import { useStore } from "../services/store"
import { currency, shortDate } from "../utils/format"
import {
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Pagination,
  SearchBox,
  StatusBadge,
  VehiclePlaceholder,
} from "../components/common/UI"
import VehicleForm from "../components/forms/VehicleForm"
import { apiUrl } from "../services/api"

export function VehicleListPage() {
  const { vehicles, removeVehicle } = useStore()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("search") || ""),
    [brand, setBrand] = useState(""),
    [category, setCategory] = useState(""),
    [year, setYear] = useState(""),
    [status, setStatus] = useState(""),
    [minPrice, setMinPrice] = useState(""),
    [maxPrice, setMaxPrice] = useState(""),
    [sort, setSort] = useState("brand"),
    [page, setPage] = useState(1),
    [remove, setRemove] = useState(null),
    [actionError, setActionError] = useState("")
  const rows = useMemo(
    () =>
      vehicles
        .filter(
          (v) =>
            `${v.id} ${v.brand} ${v.model}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (!brand || v.brand === brand) &&
            (!category || v.category === category) &&
            (!year || String(v.year) === year) &&
            (!status || stockStatus(v) === status) &&
            (!minPrice || v.price >= Number(minPrice)) &&
            (!maxPrice || v.price <= Number(maxPrice)),
        )
        .sort((a, b) =>
          String(a[sort]).localeCompare(String(b[sort]), undefined, {
            numeric: true,
          }),
        ),
    [vehicles, query, brand, category, year, status, minPrice, maxPrice, sort],
  )
  const per = 5,
    pages = Math.max(1, Math.ceil(rows.length / per)),
    shown = rows.slice((page - 1) * per, page * per)
  const clear = () => {
    setQuery("")
    setBrand("")
    setCategory("")
    setYear("")
    setStatus("")
    setMinPrice("")
    setMaxPrice("")
    setPage(1)
  }
  return (
    <>
      <PageHeader
        title="Vehicle Inventory"
        description={`${vehicles.length} vehicle records · ${vehicles.reduce((s, v) => s + v.stock, 0)} units available`}
        actions={
          <Link className="btn btn-primary" to="/vehicles/new">
            <Plus size={17} /> Add Vehicle
          </Link>
        }
      />
      <section className="panel">
        <div className="filters vehicle-filters">
          <SearchBox
            value={query}
            onChange={(v) => {
              setQuery(v)
              setPage(1)
            }}
            placeholder="Search ID, brand, or model"
          />
          <select
            className="form-select"
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value)
              setPage(1)
            }}
            aria-label="Filter by brand"
          >
            <option value="">All brands</option>
            {[...new Set(vehicles.map((v) => v.brand))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            className="form-select"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {[...new Set(vehicles.map((v) => v.category))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            className="form-select"
            value={year}
            onChange={(e) => {
              setYear(e.target.value)
              setPage(1)
            }}
            aria-label="Filter by manufacturing year"
          >
            <option value="">All years</option>
            {[...new Set(vehicles.map((v) => v.year))]
              .sort((a, b) => b - a)
              .map((x) => (
                <option key={x}>{x}</option>
              ))}
          </select>
          <select
            className="form-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            aria-label="Filter by stock status"
          >
            <option value="">All stock status</option>
            <option>In stock</option>
            <option>Low stock</option>
            <option>Out of stock</option>
          </select>
          <input
            className="form-control"
            type="number"
            min="0"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value)
              setPage(1)
            }}
            placeholder="Min price (₹)"
            aria-label="Minimum listed price"
          />
          <input
            className="form-control"
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value)
              setPage(1)
            }}
            placeholder="Max price (₹)"
            aria-label="Maximum listed price"
          />
          <select
            className="form-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort vehicles"
          >
            <option value="brand">Sort: Brand</option>
            <option value="price">Sort: Price</option>
            <option value="stock">Sort: Stock</option>
            <option value="year">Sort: Year</option>
          </select>
          <button className="btn btn-light" onClick={clear}>
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
                  <th>Vehicle ID</th>
                  <th>Vehicle</th>
                  <th>Year</th>
                  <th>Category / Fuel</th>
                  <th>Listed price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{v.id}</strong>
                    </td>
                    <td>
                      <b>
                        {v.brand} {v.model}
                      </b>
                      <small>{v.color}</small>
                    </td>
                    <td>{v.year}</td>
                    <td>
                      {v.category}
                      <small>{v.fuel}</small>
                    </td>
                    <td>{currency(v.price)}</td>
                    <td>{v.stock}</td>
                    <td>
                      <StatusBadge value={stockStatus(v)} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link
                          to={`/vehicles/${v.id}`}
                          aria-label={`View ${v.model}`}
                        >
                          <Eye size={17} />
                        </Link>
                        <Link
                          to={`/vehicles/${v.id}/edit`}
                          aria-label={`Edit ${v.model}`}
                        >
                          <Edit3 size={17} />
                        </Link>
                        <button
                          onClick={() => setRemove(v)}
                          aria-label={`Archive ${v.model}`}
                        >
                          <Archive size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
        <Pagination page={page} pages={pages} onChange={setPage} />
      </section>
      <ConfirmDialog
        open={!!remove}
        title="Archive vehicle record?"
        message={
          remove
            ? `${remove.brand} ${remove.model} will be removed or archived to preserve sales history.`
            : ""
        }
        confirmLabel="Archive Vehicle"
        danger
        onClose={() => setRemove(null)}
        onConfirm={async () => {
          try {
            await removeVehicle(remove.id)
            setRemove(null)
            setActionError("")
          } catch (error) {
            setActionError(error.message)
          }
        }}
      />
    </>
  )
}

export function VehicleFormPage() {
  const { id } = useParams(),
    store = useStore(),
    initial = store.vehicles.find((v) => v.id === id)
  return (
    <>
      <PageHeader
        title={initial ? "Edit Vehicle" : "Add Vehicle"}
        description={
          initial
            ? `Update specifications and inventory settings for ${initial.id}.`
            : "Create a vehicle record for showroom inventory."
        }
      />
      <VehicleForm initial={initial} onSave={(v) => store.saveVehicle(v, id)} />
    </>
  )
}

export function VehicleDetailsPage() {
  const [failedImageUrl, setFailedImageUrl] = useState("")
  const { id } = useParams(),
    { vehicles, sales, customers, adjustments } = useStore(),
    v = vehicles.find((x) => x.id === id),
    navigate = useNavigate()

  if (!v)
    return (
      <EmptyState
        title="Vehicle not found"
        message="This record may have been archived."
      />
    )
  const related = sales.filter((s) => s.vehicleId === id),
    history = adjustments.filter((a) => a.vehicleId === id)
  return (
    <>
      <PageHeader
        title={`${v.brand} ${v.model}`}
        description={`${v.id} · ${v.year} ${v.category}`}
        actions={
          <>
            <button
              className="btn btn-outline-secondary"
              onClick={() => navigate("/vehicles")}
            >
              <ArrowLeft size={17} /> Back
            </button>
            <Link className="btn btn-primary" to={`/vehicles/${id}/edit`}>
              <Edit3 size={17} /> Edit Vehicle
            </Link>
          </>
        }
      />
      <div className="detail-grid">
        <section className="panel vehicle-hero">
          {v.imageUrl && failedImageUrl !== v.imageUrl ? (
            <img
              src={apiUrl(v.imageUrl)}
              alt={`${v.brand} ${v.model}`}
              onError={() => setFailedImageUrl(v.imageUrl)}
              style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain" }}
            />
          ) : (
            <VehiclePlaceholder />
          )}
          <div className="vehicle-price">
            <span>Listed price</span>
            <strong>{currency(v.price)}</strong>
            <StatusBadge value={stockStatus(v)} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Current stock</h2>
              <p>Availability information</p>
            </div>
          </div>
          <div className="stock-figure">
            <strong>{v.stock}</strong>
            <span>units available</span>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Low-stock threshold</dt>
              <dd>{v.threshold} units</dd>
            </div>
            <div>
              <dt>Stock status</dt>
              <dd>{stockStatus(v)}</dd>
            </div>
          </dl>
        </section>
      </div>
      <section className="panel mt-4">
        <div className="panel-head">
          <div>
            <h2>Vehicle specifications</h2>
            <p>{v.description}</p>
          </div>
        </div>
        <dl className="spec-grid">
          {[
            ["Brand", v.brand],
            ["Model", v.model],
            ["Manufacturing year", v.year],
            ["Category", v.category],
            ["Fuel type", v.fuel],
            ["Transmission", v.transmission],
            ["Color", v.color],
            ["Vehicle ID", v.id],
          ].map(([k, val]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{val}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="detail-grid mt-4">
        <History
          title="Related sales"
          rows={related.map((s) => [
            s.id,
            shortDate(s.date),
            customers.find((c) => c.id === s.customerId)?.name,
            currency(s.amount),
          ])}
        />
        <History
          title="Stock adjustment history"
          rows={history.map((a) => [
            a.id,
            shortDate(a.date),
            a.reason,
            `${a.change > 0 ? "+" : ""}${a.change}`,
          ])}
        />
      </div>
    </>
  )
}
function History({ title, rows }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
      </div>
      {rows.length ? (
        <div className="mini-list">
          {rows.map((r) => (
            <div key={r[0]}>
              {r.map((c, i) => (
                <span key={i}>{c}</span>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No related records"
          message="There are no entries to display."
        />
      )}
    </section>
  )
}
const stockStatus = (v) =>
  v.stock === 0
    ? "Out of stock"
    : v.stock <= v.threshold
      ? "Low stock"
      : "In stock"
