# Deployment and Initialization Guide: Odonto-Oracle

This guide details the definitive steps to configure, package, license, and deploy the entire **Odonto-Oracle** ecosystem in both local development and production environments (Google Cloud and Vercel).

---

## 1. Environment Requirements (Configuration Variables)

Create the corresponding environment variable files for each stage of the application:

### Local Development:

#### Backend (`backend/.env`):
```ini
# Local Elasticsearch Configuration
ELASTIC_URL=http://localhost:9200
ELASTIC_API_KEY=

# Artificial Intelligence Credentials (Google AI Studio)
GOOGLE_API_KEY=your_google_gemini_api_key

# Google Cloud Storage Bucket (Optional in local. If empty, local fallback is used)
BUCKET_NAME=

# Local server URL for static links in fallback
PUBLIC_SERVER_URL=http://localhost:8080

# Email Notification Module (Testing Phase - Sandbox/Simulation Mode)
# If the Resend API Key is not provided, emails will be saved as HTML files
# in the backend's public folder for visual inspection.
RESEND_API_KEY=
```

#### Frontend (`frontend/.env.local`):
```ini
# Clerk Authentication (Multi-Tenant)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk Redirect Keys
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Google Gemini API Key for Clinical Chat in Next.js
GOOGLE_GENERATIVE_AI_API_KEY=your_google_gemini_api_key

# FastAPI Backend URL (In local, Next.js proxy is used to avoid CORS)
NEXT_PUBLIC_BACKEND_URL=/api/proxy
```

---

## 2. Local Multi-Container Initialization (Docker Compose)

The local development stack includes **Elasticsearch**, the **Elastic MCP Server**, and the **FastAPI Backend** orchestrated via Docker Compose.

### Step A: Build and start the stack
In the project root, run the following command to compile and start the services in the background:
```bash
docker-compose up --build -d
```

### Step B: Verify container status
Make sure all containers are active and healthy:
```bash
docker-compose ps
```
*   `odonto_elastic` will be available at `http://localhost:9200`.
*   `odonto_elastic_mcp` will listen on port `http://localhost:8001`.
*   `odonto_api` (FastAPI) will be available at `http://localhost:8080`.

---

## 3. Remote Testing on Mobile Devices (ngrok)

To expose the application locally and enable secure login, responsive touch navigation, and API consumption from external mobile devices:

### Step A: Start the frontend tunnel
Expose the Next.js server (port 3000) through ngrok:
```bash
npx ngrok http 3000
```

### Step B: Update redirection in Clerk
Copy the generated HTTPS public URL from ngrok (e.g., `https://XXXX.ngrok-free.dev`) and register it in the Clerk developer dashboard in the **Allowed Redirect URIs** section to enable the secure authentication flow.

---

## 4. Repository Preparation and Licensing

To comply with the Hackathon rules, the repository must be public and include detectable official licensing:

1.  **Exclusions via Gitignore:** Ensure that `.env`, `.env.local` files, and virtual environment folders (`venv`, `.next`) are not included in the repository. The `.gitignore` file at the root already handles these restrictions.
2.  **License Confirmation:** The official `LICENSE` file (MIT License) has been incorporated into the root directory so it can be indexed transparently by GitHub and the Devpost platform.
3.  **Synchronizing Changes:**
    ```bash
    git add .
    git commit -m "docs: unify deployment guides and update documentation"
    git push origin main
    ```

---

## 5. Elasticsearch Configuration in the Cloud (Elastic Cloud)

In production, to guarantee persistence and global availability, a database indexed in Elastic Cloud is used:

1.  **Create the Project in Elastic Cloud:**
    * Log in to [Elastic Cloud](https://cloud.elastic.co/).
    * Create a project of type **Elasticsearch Serverless**.
    * Copy the generated Elasticsearch **Endpoint URL** (e.g., `https://my-elastic-endpoint.es.us-central1.gcp.elastic.cloud:443`).
    * Create and save an **API Key** from the project's security menu.
2.  **Populate Schemas and Seed Data:**
    From the local console with the virtual environment active, run the configuration script passing the production environment variables:
    ```bash
    # In Windows Powershell:
    $env:ELASTIC_URL="https://my-elastic-endpoint.es.us-central1.gcp.elastic.cloud:443"
    $env:ELASTIC_API_KEY="your_elastic_cloud_api_key"
    python backend/setup_elastic.py
    ```
    *This will initialize the `pacientes_produccion` and `literatura_clinica_vectores` indices in the cloud with their corresponding vector mappings (dense_vector) and multi-tenant identifiers.*

---

## 6. Google Cloud Storage (GCS) Bucket Configuration

To prevent the loss of clinical PDFs (prescriptions, estimates) due to the ephemeral nature of Cloud Run instances, decoupled storage is implemented in Google Cloud Storage:

### Step A: Create the Storage Bucket
Create a regional storage bucket in Google Cloud using `gcloud` or `gsutil` in the same deployment region (`us-central1`):
```bash
gcloud storage buckets create gs://odontooracle-documentos-prod --location=us-central1
```
Or using gsutil:
```bash
gsutil mb -l us-central1 gs://odontooracle-documentos-prod
```

### Step B: Configure Public Read Access
To allow direct and frictionless download of documents from the frontend by doctors and patients, assign public read permissions to the bucket:
```bash
gcloud storage buckets add-iam-policy-binding gs://odontooracle-documentos-prod \
    --member=allUsers \
    --role=roles/storage.objectViewer
```
Or using gsutil:
```bash
gsutil iam ch allUsers:objectViewer gs://odontooracle-documentos-prod
```

---

## 7. Packaging and Deployment of the Backend (Google Cloud Run)

The FastAPI backend is ready to be packaged in Docker and run serverlessly on Google Cloud Run.

### Step A: Configure the GCP project
Make sure you are authenticated in the gcloud CLI and set your project ID:
```bash
gcloud auth login
gcloud config set project [YOUR-GCP-PROJECT-ID]
```

### Step B: Enable necessary services
Enable the build and execution APIs in your console:
```bash
gcloud services enable artifactregistry.googleapis.com run.googleapis.com
```

### Step C: Create the Artifact Registry Repository
Create a secure repository to store the application's Docker images:
```bash
gcloud artifacts repositories create odonto-oracle-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for Odonto-Oracle"
```

### Step D: Compile the Docker Image in the Cloud
Compile the image using Cloud Builds from the project root:
```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/[YOUR-GCP-PROJECT-ID]/odonto-oracle-repo/backend:latest ./backend
```

### Step E: Deploy to Google Cloud Run
Deploy the microservice and inject the final production environment variables. Replace the corresponding credentials:
```bash
gcloud run deploy odonto-oracle-backend \
  --image us-central1-docker.pkg.dev/[YOUR-GCP-PROJECT-ID]/odonto-oracle-repo/backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "ELASTIC_URL=https://my-elastic-endpoint.es.us-central1.gcp.elastic.cloud:443,ELASTIC_API_KEY=your_elastic_cloud_api_key,BUCKET_NAME=odontooracle-documentos-prod,GOOGLE_API_KEY=your_google_gemini_api_key,RESEND_API_KEY=your_resend_key,PUBLIC_SERVER_URL=https://odonto-oracle-backend-xxxx.a.run.app"
```
*Save the generated public HTTPS URL at the end of the deployment.*

---

## 8. Frontend Deployment (Vercel)

The Next.js frontend is distributed globally using the Vercel platform:

1.  **Create the project:** Import the GitHub repository from your Vercel dashboard. Select the `frontend/` folder as the root directory.
2.  **Configure environment variables:** Add the following production environment variables in the project settings:
    * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = *Clerk public key in production*
    * `CLERK_SECRET_KEY` = *Clerk secret key in production*
    * `NEXT_PUBLIC_BACKEND_URL` = *Public Cloud Run URL generated in the previous step (Without a trailing slash)*
3.  **Perform Deployment:** Click **Deploy**. Vercel will configure the application and grant it a secure HTTPS domain (e.g., `https://odonto-oracle.vercel.app`).
4.  **Enable Clerk Redirect:** Go to the Clerk dashboard and add the public Vercel URL to the **Allowed Redirect URIs** list to prevent security collisions.

---

## 9. Model Context Protocol (MCP) and Agent Builder Orchestration

To enable native interconnection between the cloud AI agent and local/production vector storage:

1.  **Expose the MCP Server on Cloud Run:**
    For a complete production environment, deploy the `elastic-mcp` server to Cloud Run by binding your Elastic Cloud endpoint:
    ```bash
    gcloud run deploy odonto-oracle-mcp \
      --image docker.elastic.co/elasticsearch/mcp-server:latest \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars "ES_URL=https://my-elastic-endpoint.es.us-central1.gcp.elastic.cloud:443,ES_API_KEY=your_elastic_cloud_api_key,MCP_PORT=8080"
    ```
2.  **Link to Google Cloud Agent Builder:**
    * Go to the Google Cloud Agent Builder console.
    * In the **Tools** section, add a tool of type **Model Context Protocol (MCP)**.
    * Enter the public HTTPS URL of your production MCP server. The Gemini agent will be able to consume the indices directly.
    * For operational tools, register a tool of type **OpenAPI** and enter your backend documentation endpoint: `https://your-backend-cloudrun.run.app/openapi.json`. The agent will automatically map all clinical flows.
