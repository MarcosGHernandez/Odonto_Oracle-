# Odonto-Oracle: CDSS & Agente Administrativo Dental

Odonto-Oracle es un Sistema de Soporte a Decisiones Clínicas (CDSS) y un agente administrativo avanzado para clínicas odontológicas. Permite a los odontólogos gestionar expedientes de pacientes, agendar consultas, generar recetas y presupuestos estructurados en PDF, automatizar notificaciones post-operatorias vía WhatsApp/SMS/Email, y realizar consultas clínicas avanzadas de soporte con inteligencia artificial (RAG sobre guías clínicas).

---

## 🛠️ Arquitectura y Stack Tecnológico

El sistema está diseñado bajo una arquitectura modular y distribuida, garantizando resiliencia y aislamiento estricto de los datos:

*   **Frontend**: Next.js (App Router), React, TailwindCSS. Interfaz responsiva premium con soporte para temas oscuro/claro y bilingüe (Español/Inglés).
*   **Autenticación**: Clerk (Multi-Tenant). Proporciona el control de acceso y deriva el identificador único de la clínica (`clinica_id`) de la sesión activa.
*   **Backend / API**: FastAPI (Python 3.10+). Estructurado de manera modular con endpoints de herramientas clínicas consumibles por agentes de IA.
*   **Base de Datos y Motor de Búsqueda**: Elasticsearch Cloud Serverless. Utilizado para almacenamiento híbrido (datos relacionales estructurados e indexación de embeddings vectoriales de 768 dimensiones).
*   **Orquestación de IA**: Integración directa con Google Cloud Agent Builder e integraciones del backend mediante el protocolo MCP (Model Context Protocol).
*   **APIs Externas**:
    *   **Twilio API**: Entrega de alertas y recordatorios post-operatorios vía WhatsApp y SMS.
    *   **ReportLab**: Generador dinámico y seguro de recetas y presupuestos en formato PDF.

---

## 🛡️ Seguridad Multi-Tenant por Diseño (Multi-Tenancy)

El sistema implementa seguridad a nivel de datos y consultas desde sus cimientos:
1.  **Aislamiento de Índices**: Cada registro insertado y consultado en Elasticsearch está filtrado de manera obligatoria por el campo `clinica_id`. Ninguna query puede ejecutarse globalmente.
2.  **Protección de Datos Sensibles**: La clave `clinica_id` se deriva en el frontend desde el token seguro de Clerk y se inyecta en las peticiones del proxy de manera automatizada.
3.  **Resiliencia Anti-Crash**: Todas las herramientas de Python capturan excepciones internas y devuelven respuestas en lenguaje natural descriptivas para que el Agente LLM pueda autocorregirse de inmediato ante fallos de entrada de datos (ej. formato de fechas erróneo) o problemas de red.

---

## 🚀 Instalación y Configuración Local

### 1. Requisitos Previos
*   Python 3.10 o superior instalado.
*   Node.js v18 o superior con `npm`.
*   Una cuenta en Elastic Cloud (o Elasticsearch local).

### 2. Configuración del Backend (FastAPI)
1. Navega al directorio del backend:
   ```bash
   cd backend
   ```
2. Crea e instala el entorno virtual:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Copia el archivo `.env.example` a `.env` y rellena las variables de conexión a Elasticsearch Cloud:
   ```bash
   cp .env.example .env
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   python -m uvicorn main:app --port 8080 --host 127.0.0.1
   ```

### 3. Configuración del Frontend (Next.js)
1. Navega al directorio del frontend:
   ```bash
   cd ../frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Copia el archivo `.env.example` a `.env.local` y rellena las credenciales de Clerk y Google Gemini:
   ```bash
   cp .env.example .env.local
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🧪 Pruebas y Validación de Seguridad

El backend incluye suites de pruebas automatizadas para validar la funcionalidad y los mecanismos de seguridad:

*   **Pruebas de Integración Clínica**: Valida el estado de la API, el web scraper con enlaces reales de distribuidores mexicanos/estadounidenses, la generación de PDFs clínicos y el envío de notificaciones simuladas:
    ```bash
    python verify_advanced.py
    ```
*   **Suite de Seguridad (Multi-Tenancy y Prompt Injection)**: Evalúa que el aislamiento de datos funcione correctamente ante accesos no autorizados de otros `clinica_id`, valida la sanitización de inputs (evitando SQL Injection/XSS) y prueba la estabilidad ante concurrencia:
    ```bash
    python security_test.py
    ```
