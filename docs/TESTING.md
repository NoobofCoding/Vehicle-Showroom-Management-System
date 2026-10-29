# Testing and verification

Run commands from the project root in Windows PowerShell:

```powershell
Set-Location C:\Users\bg057\Downloads\project
npm run format:check
npm test
npm run lint
npm run build
Get-ChildItem backend\src,backend\tests,backend\scripts -Recurse -Filter *.js |
  ForEach-Object { node --check $_.FullName }
```

`npm test` runs backend and frontend unit tests. `npm run lint` checks frontend,
backend, E2E, and root JavaScript configuration. `npm run build` creates the
frontend production bundle in `frontend\dist`.

## Transaction-capable local MongoDB

The sale, cancellation, and stock-adjustment workflows update multiple
documents that must succeed or roll back together. They use MongoDB
transactions; the API does not fall back to non-atomic writes. MongoDB runs as
a loopback-only one-node replica set named `autodesk` on the existing Windows
service at port `27017`. Application data uses database `autodesk`. Test
commands only connect to their dedicated test databases and never clean the
application database.

The app's ignored `backend\.env` uses:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/autodesk?replicaSet=autodesk
```

See [DATABASE.md](./DATABASE.md) for service configuration and verification.
The API health response must report `transactions: "supported"` and
`databaseName: "autodesk"` before testing transaction workflows.

## Isolated API integration test

The API integration suite requires an explicitly set URI, a loopback host, an
empty database whose name begins with `autodesk_test`, and transaction support.
It refuses the development DB and removes only IDs it created. For the configured
`autodesk` replica set:

```powershell
Set-Location C:\Users\bg057\Downloads\project
$env:AUTODESK_TEST_MONGODB_URI = "mongodb://127.0.0.1:27017/autodesk_test?replicaSet=autodesk"
try {
  npm run test:integration
  if ($LASTEXITCODE -ne 0) { throw "API integration tests failed." }
} finally {
  Remove-Item Env:\AUTODESK_TEST_MONGODB_URI -ErrorAction SilentlyContinue
}
```

The suite exercises the real Express routes, including authorization,
validation, vehicle/customer CRUD, sales, insufficient and concurrent sales,
cancellation, stock adjustments, dashboard/reports, and settings. Never use
`autodesk`, `autodesk_dev`, a production database, or a remote host.
Authentication assertions cover normalized email lookup, wrong-password and
unknown-email rejection, active test-user status, persisted bcrypt hash
verification, response shape, cookie-based sessions, protected routes, and
logout. The browser test checks valid and invalid sign-in, session persistence
across refresh, and protected access after logout.

## Real-browser E2E suite

Install the browser once if needed:

```powershell
npx playwright install chromium
```

The E2E test runs the actual Vite frontend and Express backend on isolated
ports, creates a temporary staff account and showroom settings, and exercises
vehicle create/search/edit/reload, customer registration, sale/stock,
overselling, cancellation/idempotency, adjustments, dashboard/reports, settings
validation and persistence, CSV download, invoice printing/print CSS, logout,
protected frontend routes, and an unauthenticated API request.

E2E requires an explicit local `autodesk_e2e_test` URI. Setup rejects other
database names/hosts and refuses to start if any application collection is
non-empty. A temporary manifest records exact created document IDs. Global
teardown removes only those IDs and verifies removal; it never drops the
database. Run it with:

```powershell
Set-Location C:\Users\bg057\Downloads\project
$env:AUTODESK_E2E_MONGODB_URI = "mongodb://127.0.0.1:27017/autodesk_e2e_test?replicaSet=autodesk"
try {
  npm run test:e2e
  if ($LASTEXITCODE -ne 0) { throw "Browser E2E tests failed." }
} finally {
  Remove-Item Env:\AUTODESK_E2E_MONGODB_URI -ErrorAction SilentlyContinue
}
```

The Playwright configuration starts and stops its own API and Vite test
servers. To independently verify the E2E database is empty after a run:

```powershell
Set-Location C:\Users\bg057\Downloads\project\backend
node --input-type=module -e "import mongoose from 'mongoose'; await mongoose.connect('mongodb://127.0.0.1:27017/autodesk_e2e_test?replicaSet=autodesk'); const db=mongoose.connection.db; const counts={}; for (const {name} of await db.listCollections().toArray()) counts[name]=await db.collection(name).countDocuments(); console.log(JSON.stringify({database:db.databaseName,counts})); await mongoose.disconnect()"
```

The test fixtures use temporary random credentials stored only in a local
temporary manifest, which teardown removes. Never commit that manifest or
credentials. E2E report and result folders are ignored by Git.

## CSV, print, and settings verification

- CSV tests validate header and record ordering, date and INR formatting,
  quoting for delimiters/quotes/newlines, and safe handling of
  spreadsheet-formula prefixes. The browser test checks the actual downloaded
  filename, headers, and sample row values/content.
- The browser test intercepts the invoice print request (without opening a
  native OS dialog), verifies invoice content, and emulates print media to
  confirm the sidebar is hidden while the invoice remains visible. Native print
  dialog behavior is not automated.
- The browser test loads existing settings, verifies invalid negative
  low-stock threshold validation, saves a changed showroom name, reloads the
  page, and confirms the value in the form and API response.

## Known limitations

- Frontend automated tests use Node's built-in `node:test` and cover API/CSV
  utilities; the Playwright suite covers the user-facing workflow.
- The one-node replica set provides local transaction support, not high
  availability or production resilience.
- This verification is not an independent security certification. Production
  deployment still requires organization-specific secrets, access controls,
  backups, monitoring, and infrastructure review.
