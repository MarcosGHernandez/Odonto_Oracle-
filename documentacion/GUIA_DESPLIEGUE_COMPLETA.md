# Guía Completa de Despliegue en Producción: Odonto-Oracle

Esta guía detalla los pasos definitivos para empaquetar, licenciar y desplegar el ecosistema de **Odonto-Oracle** en producción para cumplir con todos los requerimientos y rúbricas del Hackathon (Elastic Track).

---

## 1. Preparación del Repositorio Público (GitHub y Open Source)

El hackathon exige que el código fuente sea público e incluya un archivo de licencia detectable.

1. **Subir los cambios locales a Git:**
   Asegúrese de que los archivos de configuración local `.env` y `.env.local` no se suban. Hemos configurado el archivo `.gitignore` en la raíz del proyecto para bloquearlos automáticamente.
   
2. **Confirmación del archivo de Licencia:**
   Hemos añadido el archivo `LICENSE` (Licencia MIT oficial) en la raíz del proyecto. Al subirlo a GitHub, se mostrará como un repositorio de código abierto detectable por la plataforma Devpost.
   
3. **Subir al repositorio público:**
   ```bash
   git add .
   git commit -m "Preparación final de despliegue, auditoría de seguridad y licencia MIT"
   git push origin main
   ```

---

## 2. Configuración de Base de Datos (Elastic Cloud Serverless)

En lugar de depender del contenedor de Docker local, utilizaremos una instancia administrada en la nube para el despliegue real:

1. **Crear instancia en Elastic Cloud:**
   * Inicie sesión en [Elastic Cloud](https://cloud.elastic.co/).
   * Cree un proyecto de tipo **Elasticsearch Serverless**.
   * Copie el **Endpoint URL** de Elasticsearch (ej. `https://my-elasticsearch-project.es.us-central1.gcp.elastic.cloud:443`).
   * Genere y copie una **API Key** desde la sección de credenciales de su proyecto.

2. **Inicializar y poblar datos semilla en la nube:**
   Desde su consola local (con el entorno virtual activo), ejecute el script de inicialización apuntando a la nube mediante variables temporales:
   ```bash
   # En Windows Powershell:
   $env:ELASTIC_URL="https://su-endpoint-elastic-cloud:443"
   $env:ELASTIC_API_KEY="su_api_key_de_elastic"
   python backend/setup_elastic.py
   ```
   *Esto creará los esquemas e índices `pacientes_produccion`, `consultas_produccion` y `historial_precios` en su base de datos de Elastic Cloud.*

---

## 3. Empaquetamiento y Despliegue del Backend (Google Cloud Run)

El backend de FastAPI está listo para ser empaquetado en un contenedor Docker y desplegado en Google Cloud Run.

### Paso A: Autenticar Google Cloud SDK
Asegúrese de tener instalada la herramienta de línea de comandos `gcloud` y ejecute:
```bash
gcloud auth login
gcloud config set project [ID-DE-SU-PROYECTO-GCP]
```

### Paso B: Empaquetar y subir al Artifact Registry
1. **Habilite el registro de contenedores en su proyecto de GCP:**
   ```bash
   gcloud services enable artifactregistry.googleapis.com run.googleapis.com
   ```
2. **Crear un repositorio de Artifact Registry:**
   ```bash
   gcloud artifacts repositories create odonto-oracle-repo \
       --repository-format=docker \
       --location=us-central1 \
       --description="Repositorio Docker para Odonto-Oracle"
   ```
3. **Compilar e indexar la imagen usando Cloud Builds:**
   Ejecute el siguiente comando desde la raíz del proyecto para empaquetar el backend en la nube utilizando el Dockerfile:
   ```bash
   gcloud builds submit --tag us-central1-docker.pkg.dev/[ID-PROYECTO-GCP]/odonto-oracle-repo/backend:latest ./backend
   ```

### Paso C: Desplegar en Google Cloud Run
Ejecute el despliegue del contenedor asociando las variables de entorno de producción de Elasticsearch:
```bash
gcloud run deploy odonto-oracle-backend \
  --image us-central1-docker.pkg.dev/[ID-PROYECTO-GCP]/odonto-oracle-repo/backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "ELASTIC_URL=https://su-endpoint-elastic-cloud:443,ELASTIC_API_KEY=su_api_key_de_elastic,PUBLIC_SERVER_URL=https://odonto-oracle-backend-xxxx.a.run.app"
```
*Copie la URL pública generada de Cloud Run (ej. `https://odonto-oracle-backend-xxxx.run.app`).*

---

## 4. Despliegue del Frontend (Vercel)

El frontend de Next.js se compilará en Vercel para una distribución rápida de su interfaz móvil y de escritorio.

1. **Crear un proyecto en Vercel:**
   * Inicie sesión en [Vercel](https://vercel.com/) y vincule su cuenta de GitHub.
   * Seleccione **Import Project** y elija el repositorio de `Hackaton odonto`.
   * Configure el directorio raíz del proyecto como `frontend/`.

2. **Declarar las Variables de Entorno de Producción:**
   Añada las siguientes variables en la sección de configuración del proyecto en Vercel:
   * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = *Clave pública de Clerk de producción*
   * `CLERK_SECRET_KEY` = *Clave secreta de Clerk de producción*
   * `NEXT_PUBLIC_BACKEND_URL` = *URL pública del backend de Cloud Run generada en el paso anterior (sin barra final)*

3. **Compilar y publicar:**
   Haga clic en **Deploy**. Vercel compilará la aplicación de Next.js y generará su dominio de producción (ej. `https://odonto-oracle.vercel.app`).

4. **Ajuste en Clerk (Paso Crítico de Producción):**
   * Vaya al panel de desarrollador de Clerk.
   * En la sección **Allowed Redirect URIs**, añada el dominio de su frontend desplegado (`https://odonto-oracle.vercel.app`) para permitir flujos seguros de redirección de inicio de sesión de los médicos.

---

## 5. Orquestación del Agente de IA (Google Cloud Agent Builder)

Una vez que el backend y el frontend están en la nube, configuramos el agente Gemini:

1. **Configurar el Agente en Agent Builder:**
   * Cree un nuevo **Chat Agent** en la consola de Google Cloud Agent Builder.
   * Seleccione **Gemini 2.5 Flash** o **Gemini 2.5 Pro** como el cerebro de su agente.
   * Pegue las directrices de comportamiento clínico y de guardrails de inyección detalladas en `AGENTS.md` dentro de la sección de **Instrucciones del Sistema (System Instructions)**.

2. **Importar Herramientas del Backend (OpenAPI Tools):**
   * El backend de FastAPI expone su documentación OpenAPI de forma dinámica en la ruta `/openapi.json`.
   * En Agent Builder, cree una nueva **Herramienta (Tool)** de tipo **OpenAPI**.
   * Pegue la URL del spec de su backend (ej. `https://odonto-oracle-backend-xxxx.run.app/openapi.json`) o importe el contenido JSON para registrar de forma automática las herramientas:
     * `buscar_paciente`
     * `schedule_appointment`
     * `generar_documento_clinico`
     * `enviar_notificacion_email`
     * `complete_appointment`

3. **Grounding Híbrido con Elasticsearch MCP:**
   * Despliegue el contenedor de `elastic-mcp` en Cloud Run o expóngalo.
   * Conéctelo como el conector de datos del Agente en Agent Builder.
   * El agente utilizará automáticamente el servidor MCP para buscar expedientes y literatura clínica en caliente a través de Elasticsearch.
