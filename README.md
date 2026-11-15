# FairVision

FairVision is a web app for auditing how binary outcomes differ across demographic groups. Upload a CSV, configure the outcome and sensitive attribute, then compare group metrics before and after applying a mitigation. Use Audit Intelligence to examine multiple attributes and intersectional groups, and export the findings as a PDF.

## What you can do

- **Train and evaluate a baseline.** Fit a logistic regression model and compare overall accuracy, group selection rates, demographic parity difference, and disparate impact.
- **Compare mitigation results.** Adjust the decision threshold for the configured comparison group and review the resulting changes in accuracy and selection rates.
- **Run an audit.** Review disparities by attribute and across combined groups, with summaries of ethical risk and fairness trends across prior audits.
- **Keep a record.** Revisit prior datasets and analyses in History and download PDF reports from Reports.

## Run locally

You need Git, a reachable MongoDB instance, Python 3.11 or 3.12, and Node.js 20.19+ on the 20.x line or Node.js 22.12+.

Clone the repository:

```sh
git clone https://github.com/Shaikh-Areeb41/Fair-Vision-.git
cd Fair-Vision-
```

### 1. Start the backend

Create `FV_backend/.env`:

```dotenv
MONGODB_URL=mongodb://127.0.0.1:27017
DB_NAME=fairvision_db
SECRET_KEY=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:5173
APP_ENV=development
```

Replace `SECRET_KEY` with a generated secret before starting the API. To use a remote MongoDB instance, replace `MONGODB_URL` with its connection string. Keep the environment file local.

From the repository root, run:

```powershell
cd FV_backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

On macOS or Linux, use `.venv/bin/python` for the last two commands. The API creates its MongoDB indexes at startup. Open [Swagger UI](http://127.0.0.1:8000/docs) to inspect and try the endpoints.

### 2. Start the frontend

In a second terminal, create `ui_project/.env`:

```dotenv
VITE_API_URL=http://127.0.0.1:8000/api
```

Keep the `/api` suffix because the frontend appends endpoint paths to this URL. From the repository root, run:

```sh
cd ui_project
npm ci
npm run dev
```

Open [FairVision](http://localhost:5173). Register and verify your email, then sign in. In development, if email delivery fails, the frontend shows the verification code returned by the API. To send verification and password reset emails, configure `RESEND_API_KEY` and `SMTP_FROM` in `FV_backend/.env`.

Google and GitHub sign-in are optional. Each provider needs its client ID, client secret, and a registered callback URL. The backend expects `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` for Google, or the corresponding `GITHUB_*` settings for GitHub. The local callback paths are `/api/auth/google/callback` and `/api/auth/github/callback` on port 8000.

## Try a sample audit

1. Upload the [sample hiring CSV](FV_backend/stored_datasets/69b43f0ed71dee68a6cfb2ee/296b52bfd0804ff88495cdbf577a7d44_biased_hiring.csv) from your clone.
2. Set `Hired` as the target and `Gender` as the sensitive attribute. Use `Male` as the reference group and `Female` as the comparison group for this example.
3. Train the baseline and compare selection rates and accuracy. Open **Mitigation** to see how adjusting the comparison group's threshold changes those metrics.
4. In **Audit Intelligence**, use `Hired` as the outcome and choose the attributes to inspect. Use `1` as the positive label if prompted. Export a PDF from **Reports**.

## Repository layout

| Path | Contents |
| --- | --- |
| [`ui_project/`](ui_project/) | React and TypeScript frontend with Vite, Tailwind CSS, and Recharts |
| [`FV_backend/routers/`](FV_backend/routers/) | FastAPI endpoints for authentication, datasets, analysis, mitigation, audits, and reports |
| [`FV_backend/services/`](FV_backend/services/) | CSV handling, scikit-learn training, and threshold adjustment |
| [`FV_backend/audit_intelligence/`](FV_backend/audit_intelligence/) | Group metrics, intersectional analysis, risk scoring, explanations, and PDF generation |
| [`docs/`](docs/README_CODEBASE_EXPLAINABILITY.md) | Module maps and guides to the frontend and backend |

MongoDB stores accounts, dataset metadata, analysis results, and report records. The backend writes uploaded CSVs and generated PDFs to local storage. From `ui_project/`, run `npm run build` to create a production frontend build in `dist/`.

## Interpreting results

Fairness metrics depend on the chosen outcome, group definitions, and sample sizes. Review the group counts and accuracy trade-offs alongside headline scores. Proxy detection is currently disabled in the audit endpoint.
