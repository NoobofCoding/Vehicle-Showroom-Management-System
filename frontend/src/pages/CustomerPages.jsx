import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Archive, Edit3, Eye, Plus } from "lucide-react"
import { useStore } from "../services/store"
import { currency, shortDate } from "../utils/format"
import {
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Pagination,
  SearchBox,
  StatusBadge,
} from "../components/common/UI"
import CustomerForm from "../components/forms/CustomerForm"

export function CustomerListPage() {
  const { customers, removeCustomer } = useStore(),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [remove, setRemove] = useState(null),
    [actionError, setActionError] = useState("")
  const rows = useMemo(
      () =>
        customers.filter((c) =>
          `${c.id} ${c.name} ${c.phone}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
      [customers, query],
    ),
    per = 5,
    pages = Math.max(1, Math.ceil(rows.length / per)),
    shown = rows.slice((page - 1) * per, page * per)
  return (
    <>
      <PageHeader
        title="Customers"
        description={`${customers.length} customer records`}
        actions={
          <Link className="btn btn-primary" to="/customers/new">
            <Plus size={17} /> Add Customer
          </Link>
        }
      />
      <section className="panel">
        <div className="filters simple">
          <SearchBox
            value={query}
            onChange={(v) => {
              setQuery(v)
              setPage(1)
            }}
            placeholder="Search ID, name, or phone"
          />
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
                  <th>Customer ID</th>
                  <th>Full name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Registration</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.id}</strong>
                    </td>
                    <td>
                      <b>{c.name}</b>
                    </td>
                    <td>{c.phone}</td>
                    <td>{c.email}</td>
                    <td>{shortDate(c.registered)}</td>
                    <td>
                      <StatusBadge value={c.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link
                          to={`/customers/${c.id}`}
                          aria-label={`View ${c.name}`}
                        >
                          <Eye size={17} />
                        </Link>
                        <Link
                          to={`/customers/${c.id}/edit`}
                          aria-label={`Edit ${c.name}`}
                        >
                          <Edit3 size={17} />
                        </Link>
                        <button
                          onClick={() => setRemove(c)}
                          aria-label={`Archive ${c.name}`}
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
        title="Archive customer record?"
        message={
          remove
            ? `${remove.name} will be removed or archived to preserve sales history.`
            : ""
        }
        confirmLabel="Archive Customer"
        danger
        onClose={() => setRemove(null)}
        onConfirm={async () => {
          try {
            await removeCustomer(remove.id)
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
export function CustomerFormPage() {
  const { id } = useParams(),
    store = useStore(),
    initial = store.customers.find((c) => c.id === id)
  return (
    <>
      <PageHeader
        title={initial ? "Edit Customer" : "Add Customer"}
        description={
          initial
            ? `Update contact information for ${initial.id}.`
            : "Register a customer for showroom transactions."
        }
      />
      <CustomerForm
        initial={initial}
        onSave={(c) => store.saveCustomer(c, id)}
      />
    </>
  )
}
export function CustomerDetailsPage() {
  const { id } = useParams(),
    { customers, sales, vehicles } = useStore(),
    c = customers.find((x) => x.id === id)
  if (!c) return <EmptyState title="Customer not found" />
  const related = sales.filter((s) => s.customerId === id),
    total = related
      .filter((s) => s.status === "Completed")
      .reduce((a, s) => a + s.amount, 0)
  return (
    <>
      <PageHeader
        title={c.name}
        description={`${c.id} · Registered ${shortDate(c.registered)}`}
        actions={
          <Link className="btn btn-primary" to={`/customers/${id}/edit`}>
            <Edit3 size={17} /> Edit Customer
          </Link>
        }
      />
      <div className="detail-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Contact details</h2>
            <StatusBadge value={c.status} />
          </div>
          <dl className="detail-list">
            <div>
              <dt>Phone number</dt>
              <dd>{c.phone}</dd>
            </div>
            <div>
              <dt>Email address</dt>
              <dd>{c.email}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{c.address}</dd>
            </div>
          </dl>
        </section>
        <section className="panel purchase-summary">
          <span>Total recorded purchases</span>
          <strong>{currency(total)}</strong>
          <small>
            {related.filter((s) => s.status === "Completed").length} completed
            transaction(s) in displayed records
          </small>
        </section>
      </div>
      <section className="panel mt-4">
        <div className="panel-head">
          <div>
            <h2>Purchase history</h2>
            <p>Transactions connected to this customer record</p>
          </div>
        </div>
        {related.length ? (
          <div className="table-responsive">
            <table className="table data-table">
              <thead>
                <tr>
                  <th>Sale ID</th>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Quantity</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {related.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/sales/${s.id}`}>{s.id}</Link>
                    </td>
                    <td>{shortDate(s.date)}</td>
                    <td>
                      {vehicles.find((v) => v.id === s.vehicleId)?.brand}{" "}
                      {vehicles.find((v) => v.id === s.vehicleId)?.model}
                    </td>
                    <td>{s.quantity}</td>
                    <td>{currency(s.amount)}</td>
                    <td>
                      <StatusBadge value={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No purchase history" />
        )}
      </section>
    </>
  )
}
