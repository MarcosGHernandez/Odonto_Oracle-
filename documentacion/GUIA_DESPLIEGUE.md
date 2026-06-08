# Guia de Despliegue e Inicializacion: Odonto-Oracle

Esta guia detalla los pasos definitivos para configurar, empaquetar, licenciar y desplegar el ecosistema completo de **Odonto-Oracle** tanto en entornos de desarrollo local como en produccion (Google Cloud y Vercel).

---

## 1. Requerimientos de Entorno (Variables de Configuracion)

Cree los archivos de variables de entorno correspondientes para cada etapa de la aplicacion:

### Desarrollo Local:

#### Backend (`backend/.env`):
```ini
# Configuracion de Elasticsearch Local
ELASTIC_URL=http://localhost:9200
ELASTIC_API_KEY=

# Credenciales de Inteligencia Artificial (Google AI Studio)
GOOGLE_API_KEY=su_clave_api_de_google_gemini

# Bucket de Google Cloud Storage (Opcional en local. Si esta vacio, se usa el fallback local)
BUCKET_NAME=

# URL del servidor local para enlaces estaticos en fallback
PUBLIC_SERVER_URL=http://localhost:8080

# Módulo de Notificaciones por Correo (Fase de Prueba - Modo Sandbox/Simulacion)
# Si no se provee la API Key de Resend, los correos se guardaran como archivos HTML
# en la carpeta publica del backend para su inspeccion visual.
RESEND_API_KEY=
```

#### Frontend (`frontend/.env.local`):
```ini
# Clerk Authentication (Multi-Tenant)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Claves de Redireccion de Clerk
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Google Gemini API Key para Chat Clinico en Next.js
GOOGLE_GENERATIVE_AI_API_KEY=su_clave_api_de_google_gemini

# URL del Backend de FastAPI (En local se usa el proxy de Next.js para evitar CORS)
NEXT_PUBLIC_BACKEND_URL=/api/proxy
```

---

## 2. Inicializacion Local Multicontenedor (Docker Compose)

El stack de desarrollo local incluye **Elasticsearch**, el **Elastic MCP Server** y el **Backend de FastAPI** orquestados mediante Docker Compose.

### Paso A: Construir e iniciar el stack
En la raiz del proyecto, ejecute el siguiente comando para compilar e iniciar los servicios en segundo plano:
```bash
docker-compose up --build -d
```

### Paso B: Verificar el estado de los contenedores
Asegurese de que todos los contenedores esten activos y saludables:
```bash
docker-compose ps
```
*   `odonto_elastic` estara disponible en `http://localhost:9200`.
*   `odonto_elastic_mcp` escuchara en el puerto `http://localhost:8001`.
*   `odonto_api` (FastAPI) estara disponible en `http://localhost:8080`.

---

## 3. Pruebas Remotas en Dispositivos Moviles (ngrok)

Para exponer la aplicacion localmente y habilitar el inicio de sesion, la navegacion tactil responsiva y el consumo de APIs desde dispositivos moviles externos:

### Paso A: Iniciar el tunel del frontend
Exponga el servidor de Next.js (puerto 3000) a traves de ngrok:
```bash
npx ngrok http 3000
```

### Paso B: Actualizar la redireccion en Clerk
Copie la URL publica de HTTPS generada por ngrok (ej. `https://XXXX.ngrok-free.dev`) y registrela en el panel de desarrollador de Clerk en la seccion **Allowed Redirect URIs** para habilitar el flujo seguro de autenticacion.

---

## 4. Preparacion del Repositorio Publico y Licencia

Para cumplir con las bases del Hackathon, el repositorio debe ser publico e incluir licenciamiento oficial detectable:

1.  **Exclusiones mediante Gitignore:** Asegurese de que los archivos `.env`, `.env.local` y carpetas de entorno virtual (`venv`, `.next`) no se incluyan en el repositorio. El archivo `.gitignore` de la raiz ya maneja estas restricciones.
2.  **Confirmacion de Licencia:** Se ha incorporado el archivo `LICENSE` (Licencia MIT oficial) en el directorio raiz para que sea indexado de forma transparente por GitHub y la plataforma Devpost.
3.  **Sincronizacion de Cambios:**
    ```bash
    git add .
    git commit -m "docs: unificar guias de despliegue y actualizar documentacion"
    git push origin main
    ```

---

## 5. Configuracion de Elasticsearch en la Nube (Elastic Cloud)

En produccion, para garantizar persistencia y disponibilidad global, se utiliza una base de datos indexada en Elastic Cloud:

1.  **Crear el Proyecto en Elastic Cloud:**
    * Inicie sesion en [Elastic Cloud](https://cloud.elastic.co/).
    * Cree un proyecto de tipo **Elasticsearch Serverless**.
    * Copie el **Endpoint URL** de Elasticsearch generado (ej. `https://mi-endpoint-elastic.es.us-central1.gcp.elastic.cloud:443`).
    * Cree y guarde un **API Key** desde el menu de seguridad del proyecto.
2.  **Poblar Esquemas y Datos Semilla:**
    Desde la consola local con el entorno virtual activo, ejecute el script de configuracion pasando las variables de entorno de produccion:
    ```bash
    # En Windows Powershell:
    $env:ELASTIC_URL="https://mi-endpoint-elastic.es.us-central1.gcp.elastic.cloud:443"
    $env:ELASTIC_API_KEY="su_api_key_de_elastic_cloud"
    python backend/setup_elastic.py
    ```
    *Esto inicializara los indices `pacientes_produccion` y `literatura_clinica_vectores` en la nube con sus correspondientes mapeos vectoriales (dense_vector) e identificadores multi-tenant.*

---

## 6. Configuracion del Bucket en Google Cloud Storage (GCS)

Para evitar la perdida de PDFs clinicos (recetas, presupuestos) debido a la naturaleza efimera de las instancias de Cloud Run, se implementa almacenamiento desacoplado en Google Cloud Storage:

### Paso A: Crear el Bucket de Almacenamiento
Cree un bucket de almacenamiento regional en Google Cloud utilizando `gcloud` o `gsutil` en la misma region de despliegue (`us-central1`):
```bash
gcloud storage buckets create gs://odontooracle-documentos-prod --location=us-central1
```
O usando gsutil:
```bash
gsutil mb -l us-central1 gs://odontooracle-documentos-prod
```

### Paso B: Configurar Acceso Publico de Lectura
Para permitir la descarga directa y sin fricciones de los documentos desde el frontend por parte de medicos y pacientes, asigne permisos de lectura publica al bucket:
```bash
gcloud storage buckets add-iam-policy-binding gs://odontooracle-documentos-prod \
    --member=allUsers \
    --role=roles/storage.objectViewer
```
O usando gsutil:
```bash
gsutil iam ch allUsers:objectViewer gs://odontooracle-documentos-prod
```

---

## 7. Empaquetamiento y Despliegue del Backend (Google Cloud Run)

El backend de FastAPI esta listo para empaquetarse en Docker y ejecutarse de forma serverless en Google Cloud Run.

### Paso A: Configurar el proyecto de GCP
Asegurese de estar autenticado en la consola de gcloud y configure el ID de su proyecto:
```bash
gcloud auth login
gcloud config set project [ID-DE-SU-PROYECTO-GCP]
```

### Paso B: Habilitar los servicios necesarios
Habilite las APIs de compilacion y ejecucion en su consola:
```bash
gcloud services enable artifactregistry.googleapis.com run.googleapis.com
```

### Paso C: Crear el repositorio de Artifact Registry
Cree un repositorio seguro para almacenar las imagenes Docker de la aplicacion:
```bash
gcloud artifacts repositories create odonto-oracle-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="Repositorio Docker para Odonto-Oracle"
```

### Paso D: Compilar la imagen Docker en la Nube
Compile la imagen usando Cloud Builds desde la raiz del proyecto:
```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/[ID-PROYECTO-GCP]/odonto-oracle-repo/backend:latest ./backend
```

### Paso E: Desplegar en Google Cloud Run
Despliegue el microservicio e inyecte las variables de entorno definitivas de produccion. Reemplace las credenciales correspondientes:
```bash
gcloud run deploy odonto-oracle-backend \
  --image us-central1-docker.pkg.dev/[ID-PROYECTO-GCP]/odonto-oracle-repo/backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "ELASTIC_URL=https://mi-endpoint-elastic.es.us-central1.gcp.elastic.cloud:443,ELASTIC_API_KEY=su_api_key_de_elastic_cloud,BUCKET_NAME=odontooracle-documentos-prod,GOOGLE_API_KEY=su_clave_api_de_google_gemini,RESEND_API_KEY=su_key_de_resend,PUBLIC_SERVER_URL=https://odonto-oracle-backend-xxxx.a.run.app"
```
*Guarde la URL publica HTTPS generada al final del despliegue.*

---

## 8. Despliegue del Frontend (Vercel)

El frontend de Next.js se distribuye globalmente usando la plataforma Vercel:

1.  **Crear el proyecto:** Importe el repositorio de GitHub desde su panel de control en Vercel. Seleccione la carpeta `frontend/` como el directorio raiz.
2.  **Configurar variables de entorno:** Añada las siguientes variables de entorno de produccion en los ajustes del proyecto:
    * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = *Clave publica de Clerk en produccion*
    * `CLERK_SECRET_KEY` = *Clave secreta de Clerk en produccion*
    * `NEXT_PUBLIC_BACKEND_URL` = *URL publica de Cloud Run generada en el paso anterior (Sin barra diagonal al final)*
3.  **Realizar el Despliegue:** Haga clic en **Deploy**. Vercel configurara la aplicacion y le otorgara un dominio seguro HTTPS (ej. `https://odonto-oracle.vercel.app`).
4.  **Habilitar Clerk Redirect:** Vaya al panel de Clerk y añada la URL publica de Vercel en la lista de **Allowed Redirect URIs** para evitar colisiones de seguridad.

---

## 9. Orquestacion de Model Context Protocol (MCP) y Agent Builder

Para habilitar la interconexion nativa entre el agente de IA en la nube y el almacenamiento vectorial local/produccion:

1.  **Levantar el MCP Server en Cloud Run:**
    Para un entorno productivo completo, exponga el servidor `elastic-mcp` en Cloud Run vinculando su endpoint de Elastic Cloud:
    ```bash
    gcloud run deploy odonto-oracle-mcp \
      --image docker.elastic.co/elasticsearch/mcp-server:latest \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --set-env-vars "ES_URL=https://mi-endpoint-elastic.es.us-central1.gcp.elastic.cloud:443,ES_API_KEY=su_api_key_de_elastic_cloud,MCP_PORT=8080"
    ```
2.  **Vincular a Google Cloud Agent Builder:**
    * Vaya a la consola de Google Cloud Agent Builder.
    * En la seccion **Tools**, agregue una herramienta de tipo **Model Context Protocol (MCP)**.
    * Ingrese la URL publica HTTPS de su servidor MCP de produccion. El agente Gemini podra consumir los indices directamente.
    * Para herramientas operativas, registre una herramienta de tipo **OpenAPI** e ingrese el endpoint de la documentacion de su backend: `https://su-backend-cloudrun.run.app/openapi.json`. El agente mapeara de manera automatica todos los flujos clinicos.
