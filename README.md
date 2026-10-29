# AutoDesk Showroom Management

AutoDesk is a React and Bootstrap showroom administration application backed by an Express REST API and a local MongoDB database. The application manages vehicle inventory, customers, sales, stock adjustments, reports, staff sign-in, and showroom preferences.

## Architecture

- `frontend/`: React JavaScript, React Router, Bootstrap 5, Vite, and a shared API-backed state provider.
- `backend/`: Express controllers and routes, Mongoose models, staff authentication, input validation, and MongoDB operations.
- `docs/`: API, database schema, and testing notes.

The browser communicates only with the Express API. MongoDB credentials stay in `backend/.env`. No sample business records are inserted at startup.

## Requirements

- Node.js 20.19+ (Node.js 22 is recommended) and npm.
- MongoDB Community Server 9.0 installed at `C:\Program Files\MongoDB\Server\9.0\bin`.
- A local one-node replica set on the existing MongoDB Community Server service at `127.0.0.1:27017`, using database `autodesk`, for atomic sale creation, cancellation, and stock adjustments.
- Playwright Chromium for browser E2E tests (`npx playwright install chromium`).

## Install

From the repository root in Windows PowerShell:

```powershell
npm install --prefix backend
npm install --prefix frontend
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Replace `JWT_SECRET` in `backend/.env` with a private random value of at least 32 characters. The `.env` files are ignored by Git.

The backend URI is `mongodb://127.0.0.1:27017/autodesk?replicaSet=autodesk`. Keep all `.env` files private and do not copy production credentials into local configuration.

The MongoDB service must be configured as the `autodesk` replica set for transaction-backed operations. The API will not accept traffic until it connects to MongoDB and creates the model indexes. It does not silently use in-memory or browser-local data. Setup and verification details are in [docs/DATABASE.md](./docs/DATABASE.md).

## Create the first staff account

There is no public staff registration route. Customer registration creates a customer record, not a login account. Staff accounts are created from the backend CLI, which connects using `backend\.env`. From the repository root:

```powershell
npm --prefix backend run create-admin -- "Staff Name" "staff@example.com"
```

Enter a password of at least 12 characters at the hidden terminal prompt. The password is stored as a bcrypt hash. If the email already exists, the command refuses to change that account; use the original password or contact the account owner rather than creating duplicate identities.

## Run the application

Use two PowerShell terminals from the repository root:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

Open the Vite URL (normally `http://localhost:5173`). The backend health endpoint is `http://127.0.0.1:5000/api/health`.

## Validate

```powershell
npm run format
npm run format:check
npm test
npm run lint
npm run build
```

The tests cover backend/frontend behavior, isolated API workflows, and a real-browser Playwright workflow. The E2E suite requires an explicitly configured, empty `autodesk_e2e_test` database on a local transaction-capable replica set; see [docs/TESTING.md](./docs/TESTING.md). Sale/stock writes remain transaction-backed and are rejected when the connected MongoDB deployment lacks transaction support.

The opt-in API integration suite requires an empty, isolated local replica-set database whose name begins with `autodesk_test`. It refuses the development database and cleans up the exact records it creates:

```powershell
$env:AUTODESK_TEST_MONGODB_URI = "mongodb://127.0.0.1:27017/autodesk_test?replicaSet=autodesk"
npm run test:integration
Remove-Item Env:\AUTODESK_TEST_MONGODB_URI
```

The integration test only connects when this variable is explicitly set. It checks that all test collections are empty before creating its temporary records.

See [docs/API.md](./docs/API.md), [docs/DATABASE.md](./docs/DATABASE.md), and [docs/TESTING.md](./docs/TESTING.md) for API details, schema fields/indexes, local setup, and verification commands.
