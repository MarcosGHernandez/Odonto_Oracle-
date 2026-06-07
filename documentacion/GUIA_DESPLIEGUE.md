# Guía de Despliegue e Inicialización: Odonto-Oracle

Esta guía detalla los pasos para levantar el entorno de desarrollo local multicontenedor de **Odonto-Oracle**, configurar el túnel público para pruebas remotas en dispositivos móviles y desplegar los microservicios en **Google Cloud Run**.

---

## 1. Requerimientos de Entorno (Variables de Configuración)

Cree un archivo `.env` en la carpeta `backend/` y un archivo `.env.local` en la carpeta `frontend/` basándose en los siguientes esquemas:

### Variables del Backend (`backend/.env`):
```ini
# Configuración de Elasticsearch
ELASTIC_URL=http://elasticsearch:9200
ELASTIC_API_KEY=

# Credenciales de Servicios en la Nube
GOOGLE_API_KEY=su_clave_api_de_google_gemini

# Módulo de Notificaciones por Correo (Fase de Prueba - Modo Sandbox/Simulación)
# Para garantizar una demo de Hackathon 100% estable, libre de fricciones de registro o verificación
# de dominios en la API de Resend, el sistema está configurado estrictamente en Modo Simulación.
# Guarda el correo generado físicamente en la carpeta pública del backend y devuelve una URL de previsualización.

# Define la URL de su servidor local o túnel de ngrok para los enlaces del chatbot
PUBLIC_SERVER_URL=http://localhost:8000
```

### Variables del Frontend (`frontend/.env.local`):
```ini
# Clerk Authentication (Multi-Tenant)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Google Gemini API Key para Chat Clínico en Next.js
GOOGLE_GENERATIVE_AI_API_KEY=su_clave_api_de_google_gemini

# URL del Backend de FastAPI (Proxy Local/Producción)
NEXT_PUBLIC_BACKEND_URL=/api/proxy
```

---

## 2. Inicialización Local Multicontenedor (Docker Compose)

El stack de desarrollo local incluye **Elasticsearch**, el **Elastic MCP Server** y el **Backend de FastAPI** orquestados mediante Docker Compose.

### Paso A: Construir e iniciar el stack
En la raíz del proyecto, ejecute el siguiente comando para compilar e iniciar los servicios en segundo plano:
```bash
docker-compose up --build -d
```

### Paso B: Verificar el estado de los contenedores
Asegúrese de que todos los contenedores estén activos y saludables:
```bash
docker-compose ps
```
*   `odonto_elastic` escuchará en `http://localhost:9200`.
*   `odonto_elastic_mcp` (puerto del servidor MCP) escuchará en `http://localhost:8001`.
*   `odonto_api` (FastAPI) escuchará en `http://localhost:8080`.

---

## 3. Configuración del Túnel ngrok (Pruebas Móviles y MCP)

Para exponer el frontend y habilitar el inicio de sesión y la navegación táctil responsiva en dispositivos móviles desde una red externa (ideal para demos de Hackathon):

### Paso A: Iniciar el túnel del frontend
Exponga el servidor de Next.js (puerto 3000) a través de ngrok:
```bash
npx ngrok http 3000
```

### Paso B: Actualizar la redirección en Clerk
Copie la URL pública generada por ngrok (ej. `https://tierra-nonabsorptive-viola.ngrok-free.dev`) y añádala en el panel de desarrollador de Clerk en la sección **Allowed Redirect URIs** para permitir el flujo seguro de autenticación móvil.

---

## 4. Conexión de Model Context Protocol (MCP) con Google Cloud Agent Builder

Para que **Google Cloud Agent Builder** acceda a los índices clínicos de Elasticsearch mediante el Model Context Protocol:

1. Exponga el servidor MCP local (puerto 8001) a la nube usando ngrok:
   ```bash
   npx ngrok http 8001
   ```
2. En la consola de Google Cloud Agent Builder, configure un nuevo **Conector de Datos (Data Connector)** seleccionando la opción **MCP Server**.
3. Ingrese la URL pública https de ngrok del puerto 8001 como punto de enlace del servidor MCP.
4. El Agente Gemini de Google Cloud ahora podrá realizar consultas vectoriales de lenguaje natural y consumir las bases de datos locales de forma nativa a través del protocolo MCP.

---

## 5. Despliegue en Producción (Google Cloud Run)

El backend de FastAPI está preparado con un Dockerfile optimizado y optimización de hilos para su despliegue inmediato en **Google Cloud Run**:

### Paso A: Compilar e indexar la imagen en Google Artifact Registry
```bash
gcloud builds submit --tag gcr.io/nombre-proyecto-gcp/odonto-oracle-backend ./backend
```

### Paso B: Desplegar en Cloud Run con variables de entorno
```bash
gcloud run deploy odonto-oracle-backend \
  --image gcr.io/nombre-proyecto-gcp/odonto-oracle-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "ELASTIC_URL=su_url_de_elastic_cloud,GOOGLE_API_KEY=su_key,RESEND_API_KEY=su_key"
```
*Cloud Run auto-escalará el microservicio a cero cuando no haya consultas activas y escalará instantáneamente ante ráfagas de solicitudes de doctores.*
