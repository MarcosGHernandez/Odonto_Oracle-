# Odonto-Oracle: CDSS & Agente Administrativo Dental

Odonto-Oracle es un Sistema de Soporte a Decisiones Clínicas (CDSS) y un agente administrativo autónomo de nivel empresarial diseñado para consultorios y clínicas dentales. El sistema asiste a los odontólogos en la gestión de expedientes de pacientes, el agendamiento y conclusión de consultas, la cotización de insumos, la comunicación automatizada post-operatoria y la toma de decisiones clínicas respaldadas por inteligencia artificial.

---

## Stack Tecnológico y Arquitectura

El sistema está diseñado bajo una arquitectura desacoplada, modular y de alta disponibilidad:

*   **Frontend**: Next.js (App Router), React, Tailwind CSS. Cuenta con una interfaz responsiva premium adaptada para dispositivos móviles (Android/iOS), bilingüe (Español/Inglés) y soporte de temas (claro/oscuro).
*   **Autenticación**: Clerk (Multi-Tenant). Administra el control de acceso y deriva de forma segura el identificador de la clínica (`clinica_id`) de la sesión activa del doctor.
*   **Backend / API**: FastAPI (Python 3.10+). Expone endpoints modulares que actúan como herramientas clínicas consumibles por agentes de IA.
*   **Base de Datos y Vector Search**: Elasticsearch Cloud Serverless. Utilizado como base de datos híbrida para búsquedas de texto estructurado y búsquedas semánticas kNN con vectores densos de 768 dimensiones.
*   **Persistencia de Documentos**: Google Cloud Storage (GCS). Almacena de forma persistente y segura las recetas, presupuestos e historias clínicas en PDF para su consulta desde cualquier dispositivo.
*   **Orquestación de IA**: Google Agent Development Kit (ADK) integrado con Gemini 3.5 Flash (y fallback server-side a Gemini 3 Pro). Permite ejecutar el agente mediante código o vincularlo mediante el protocolo OpenAPI.
*   **APIs de Comunicación**: Twilio API para envío de notificaciones y recordatorios automatizados vía WhatsApp y SMS.

---

## Estructura del Proyecto

*   **frontend**: Interfaz de usuario en Next.js, componentes visuales, lógica de calendario y comunicación por chat con el agente.
*   **backend**: Servidor FastAPI, endpoints de negocio, lógica de scraping y scripts del agente.
    *   **backend/agent**: Paquete del agente en google-adk (`agent.py` y `__init__.py`).
    *   **backend/tools**: Herramientas del agente (scraper, pdf_generator, notifier, search).
*   **documentacion**: Manuales, especificaciones y guías de despliegue.

---

## Guía de Inicio Rápido (Desarrollo Local)

### 1. Configuración del Backend
1. Ingresa a la carpeta del backend y crea el entorno virtual:
   ```bash
   cd backend
   python -m venv venv
   # En Windows:
   .\venv\Scripts\activate
   ```
2. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
3. Configura el archivo `.env` con tus claves (Elastic Cloud, Gemini, Twilio y Resend).
4. Corre el backend local en el puerto 8080:
   ```bash
   python -m uvicorn main:app --port 8080 --host 127.0.0.1
   ```

### 2. Ejecutar el Agente Localmente (Google ADK CLI)
Puedes interactuar con el agente desde la consola de comandos usando:
```bash
adk run backend/agent
```

O lanzar la interfaz visual de depuración de ADK:
```bash
adk web backend/agent
```

### 3. Configuración del Frontend
1. Ingresa a la carpeta del frontend:
   ```bash
   cd ../frontend
   npm install
   ```
2. Configura tu archivo `.env.local` con las claves públicas y secretas de tu instancia de Clerk y la API Key de Gemini.
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre http://localhost:3000 en tu navegador.

---

## Validación y Pruebas Automatizadas

El backend contiene un conjunto de scripts para validar la integridad de la base de datos y la seguridad:

*   **Prueba Avanzada de Integración**:
    ```bash
    python backend/verify_advanced.py
    ```
    *Valida de forma simulada el flujo de registro de pacientes, agenda de citas y resolución de expedientes.*
*   **Auditoría de Seguridad (Multi-Tenant y Robustez)**:
    ```bash
    python backend/security_test.py
    ```
    *Comprueba el aislamiento estricto de los datos por `clinica_id` (Multi-Tenancy) y valida el rechazo ante inyecciones de código (SQL/XSS).*

---

## Documentación Adicional

Para más detalles, consulta las guías dedicadas de la plataforma:

1.  **ARQUITECTURA_TECNICA.md**: Flujos de datos, búsqueda híbrida y especificación de Elasticsearch MCP.
2.  **GUIA_DESPLIEGUE.md**: Configuración en producción sobre Google Cloud Run, Vercel, GCS y Clerk.
3.  **AUDITORIA_SEGURIDAD.md**: Aislamiento multi-tenant de datos y mecanismos de mitigación contra inyección de prompts.
4.  **MANUAL_USUARIO.md**: Manual del usuario clínico para los odontólogos.
