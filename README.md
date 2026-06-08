# Odonto-Oracle: Dental CDSS & Autonomous Administrative Agent

Odonto-Oracle is an enterprise-grade Clinical Decision Support System (CDSS) and autonomous administrative agent designed for dental offices and clinics. The system assists dentists in managing patient records, scheduling and completing appointments, quoting dental supplies, sending automated post-operative communications, and making clinical decisions backed by artificial intelligence.

---

## Technical Stack and Architecture

The system is designed under a decoupled, modular, and high-availability architecture:

*   **Frontend**: Next.js (App Router), React, Tailwind CSS. Features a premium responsive interface tailored for mobile devices (Android/iOS), bilingual support (Spanish/English), and theme options (light/dark).
*   **Authentication**: Clerk (Multi-Tenant). Manages access control and securely derives the clinic identifier (`clinica_id`) from the doctor's active session.
*   **Backend / API**: FastAPI (Python 3.10+). Exposes modular endpoints that act as clinical tools consumable by AI agents.
*   **Database and Vector Search**: Elasticsearch Cloud Serverless. Used as a hybrid database for structured text searches and semantic kNN searches with 768-dimensional dense vectors.
*   **Document Persistence**: Google Cloud Storage (GCS). Persistently and securely stores prescriptions, dental estimates, and clinical histories in PDF format for access from any device.
*   **AI Orchestration**: Google Agent Development Kit (ADK) integrated with Gemini 3.5 Flash (with server-side fallback to Gemini 3 Pro). Allows executing the agent via CLI commands or linking it via the OpenAPI protocol.
*   **Communication APIs**: Twilio API for sending automated notifications and reminders via WhatsApp and SMS.

---

## Project Structure

*   **frontend**: Next.js user interface, visual components, calendar logic, and chat communication with the agent.
*   **backend**: FastAPI server, business endpoints, scraping logic, and agent scripts.
    *   **backend/agent**: Agent package built with google-adk (`agent.py` and `__init__.py`).
    *   **backend/tools**: Agent tools (scraper, pdf_generator, notifier, search).
*   **documentacion**: Manuals, specifications, and deployment guides.

---

## Quick Start Guide (Local Development)

### 1. Backend Configuration
1. Enter the backend folder and create the virtual environment:
   ```bash
   cd backend
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure the `.env` file with your credentials (Elastic Cloud, Gemini, Twilio, and Resend).
4. Run the local backend on port 8080:
   ```bash
   python -m uvicorn main:app --port 8080 --host 127.0.0.1
   ```

### 2. Run the Agent Locally (Google ADK CLI)
You can interact with the agent from the CLI using:
```bash
adk run backend/agent
```

Or launch the ADK visual debugging interface:
```bash
adk web backend/agent
```

### 3. Frontend Configuration
1. Enter the frontend folder:
   ```bash
   cd ../frontend
   npm install
   ```
2. Configure your `.env.local` file with the public and secret keys of your Clerk instance and the Gemini API Key.
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000 in your browser.

---

## Validation and Automated Tests

The backend contains a set of scripts to validate database integrity and security:

*   **Advanced Integration Test**:
    ```bash
    python backend/verify_advanced.py
    ```
    *Simulates the patient registration flow, appointment scheduling, and record resolution.*
*   **Security Audit (Multi-Tenant and Robustness)**:
    ```bash
    python backend/security_test.py
    ```
    *Verifies strict data isolation by `clinica_id` (Multi-Tenancy) and validates rejection of code injection (SQL/XSS).*

---

## Additional Documentation

For more details, consult the dedicated platform guides:

1.  **TECHNICAL_ARCHITECTURE.md**: Data flows, hybrid search, and Elasticsearch MCP specification.
2.  **DEPLOYMENT_GUIDE.md**: Production deployment on Google Cloud Run, Vercel, GCS, and Clerk.
3.  **SECURITY_AUDIT.md**: Multi-tenant data isolation and prompt injection mitigation mechanisms.
4.  **USER_MANUAL.md**: Clinical user manual for dentists.
