import { useEffect, useState } from "react"

import { Link, useNavigate } from "react-router-dom"

import { Eye, EyeOff, LockKeyhole } from "lucide-react"

import { useAuth } from "../contexts/AuthContext"

import { Brand } from "../components/layout/AppLayout"

export function LoginPage() {
  const navigate = useNavigate()

  const { login, user } = useAuth()

  const [show, setShow] = useState(false)

  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({ email: "", password: "" })

  const [error, setError] = useState("")

  useEffect(() => {
    if (user) navigate("/", { replace: true })
  }, [user, navigate])

  const submit = async (event) => {
    event.preventDefault()

    if (!/^\S+@\S+\.\S+$/.test(form.email) || !form.password) {
      setError("Enter a valid email address and password.")

      return
    }

    setLoading(true)

    setError("")

    try {
      await login(form)

      navigate("/", { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-aside">
        <Brand />
        <div>
          <span>SHOWROOM OPERATIONS</span>
          <h1>Inventory, customers, and sales in one clear workspace.</h1>
          <p>Staff access to the AutoDesk showroom workspace.</p>
        </div>
        <small>AutoDesk Vehicle Showroom Management</small>
      </div>
      <main className="login-main">
        <form className="login-card" onSubmit={submit}>
          <div className="login-lock">
            <LockKeyhole size={22} />
          </div>
          <span className="eyebrow">STAFF ACCESS</span>
          <h2>Sign in</h2>
          <p>Use your showroom staff account to continue.</p>
          <p>Staff accounts are created by a showroom manager.</p>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <label className="form-label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            autoComplete="username"
            className="form-control mb-3"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
            required
          />
          <label className="form-label" htmlFor="password">
            Password
          </label>
          <div className="password-wrap">
            <input
              id="password"
              autoComplete="current-password"
              className="form-control"
              type={show ? "text" : "password"}
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
              }
              required
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            className="btn btn-primary w-100 login-submit"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
          <Link to="/privacy-policy">Privacy policy</Link>
        </form>
      </main>
    </div>
  )
}

export function PrivacyPolicyPage() {
  return (
    <div className="legal-page">
      <header>
        <Brand />
        <Link className="btn btn-outline-secondary" to="/">
          Back to application
        </Link>
      </header>
      <article>
        <span className="eyebrow">REVIEW BEFORE PUBLICATION</span>
        <h1>Privacy Policy</h1>
        <p className="lead">Last updated: [Insert review date]</p>
        <div className="legal-notice">
          This policy template describes the local AutoDesk application and
          requires review by the showroom's legal adviser before publication. It
          is not a statement of verified legal compliance.
        </div>
        <Section title="1. Introduction">
          AutoDesk is a vehicle showroom management application for staff. This
          deployment stores operational records in the configured showroom
          database.
        </Section>
        <Section title="2. Information handled by the application">
          Vehicle inventory, customer contact details, sale records, stock
          adjustments, staff account details, and showroom preferences may be
          stored in MongoDB configured by the operator. Do not enter real
          customer information into an unapproved development installation.
        </Section>
        <Section title="3. Purpose of information use">
          The application uses these records for inventory management, customer
          records, transaction documentation, stock changes, and reporting.
        </Section>
        <Section title="4. Data storage and retention">
          The deployment stores records in the MongoDB database configured by
          the operator. The showroom must determine retention periods, backups,
          deletion practices, and access controls before using real records.
        </Section>
        <Section title="5. Data security">
          The application includes staff sign-in and access controls, but this
          student project has not been independently security-certified.
          Operators must assess the deployment, network, secrets, backups, and
          access management before production use.
        </Section>
        <Section title="6. Third-party services">
          This application does not add analytics, advertising, or payment
          services. The operator should update this section if external services
          are introduced.
        </Section>
        <Section title="7. User rights and contact">
          Requests and applicable rights depend on the showroom's jurisdiction
          and policies. Contact: [Showroom legal name], [Postal address],
          [Privacy email], [Telephone]. Replace these placeholders before
          publication.
        </Section>
      </article>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  )
}

export function NotFoundPage() {
  return (
    <div className="not-found">
      <Brand />
      <span>404</span>
      <h1>Page not found</h1>
      <p>The requested AutoDesk workspace page does not exist or has moved.</p>
      <Link className="btn btn-primary" to="/">
        Go to Dashboard
      </Link>
    </div>
  )
}
