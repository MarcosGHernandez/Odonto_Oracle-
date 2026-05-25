# Plan de Desarrollo: Odonto-Oracle (Hackathon MVP)

**Proyecto:** Odonto-Oracle (CDSS y Agente Administrativo Dental)
**Rol:** AI Automation Engineer
**Partner Track:** Elastic Cloud (Elasticsearch)

Este documento define la metodología de trabajo, los estándares de ingeniería y la planificación por micro-sprints para asegurar una entrega exitosa, modular y libre de fricciones en el entorno de alta presión del hackathon.

---

##  Metodología de Desarrollo y Estándares

### 1. Estrategia de Testing (Resiliencia para Agentes LLM)
Dado que las herramientas serán consumidas por Gemini 3.1 Pro, la resiliencia backend es crítica.
*   **Defensive Python Testing (`pytest`):** Las herramientas (Scraper, Generador PDF) se probarán inyectando datos nulos, mal formateados y casos límite. El sistema no debe crashear abruptamente.
*   **Manejo de Excepciones Orientado a LLM:** Todas las excepciones de Python se capturarán y devolverán como *strings descriptivos* en texto plano. (Ej. `"System Error: El formato de la fecha es inválido. Pide al doctor la fecha en formato YYYY-MM-DD."`). Esto permite al agente autocorregirse sin intervención del desarrollador.
*   **Prompt Red-Teaming:** Pruebas de estrés manuales en Google Cloud Agent Builder para intentar vulnerar el aislamiento Multi-Tenant o forzar alucinaciones médicas.

### 2. Documentación Continua (README-Driven Development)
*   **Docstrings Obligatorios:** Cada función de Python incluirá un docstring estricto detallando `Args` y `Returns`. Esto actúa como instrucción directa para que el orquestador sepa cuándo y cómo invocar la herramienta.
*   **Especificaciones de API:** Mapeo ligero de conexiones entre el Agente y las Cloud Functions/Endpoints locales.

---

##  Plan de Micro-Sprints (Hackathon Timeline)

### Sprint 1: Cimentación e Infraestructura (Días 1-2)
**Objetivo:** Levantar los cimientos del sistema, asegurar el aislamiento Multi-Tenant y preparar la base de conocimiento vectorial y relacional.
*   **[ ]** Inicializar repositorio frontend: `npx create-next-app odonto-oracle-web` usando React y TailwindCSS.
*   **[ ]** Configurar autenticación con **Clerk** en Next.js. Capturar y exponer el `clinica_id` del usuario activo.
*   **[ ]** Crear y configurar instancia en **Elastic Cloud**.
*   **[ ]** Desarrollar `setup_elastic.py`: Script para crear los *mappings* de los índices `pacientes_produccion` (JSON relacional) y `literatura_clinica_vectores` (Búsqueda densa).
*   **[ ]** Poblar datos semilla: Inyectar 3 historiales de pacientes de prueba (incluyendo alergias/riesgos) y vectorizar 2 fragmentos de guías clínicas.
*   *Testing:* Ejecutar consultas REST para verificar que el aislamiento por `clinica_id` bloquea accesos no autorizados.

### Sprint 2: Desarrollo de "Superpoderes" / Acciones (Días 3-4)
**Objetivo:** Codificar las herramientas de acción (Tools) en Python puro, manteniéndolas modulares y desacopladas del agente.
*   **[ ]** Crear `tools/pdf_generator.py` (ReportLab/FPDF): Emisión bilingüe de recetas y presupuestos estructurados.
*   **[ ]** Crear `tools/scraper.py` (Firecrawl/BeautifulSoup): Extracción dinámica de precios en depósitos dentales regionales (MX/US).
*   **[ ]** Crear `tools/notifier.py` (Twilio/Gmail API): Módulo de notificaciones post-operatorias.
*   **[ ]** Crear `api/webhook_paciente.py`: Endpoint receptor para el formulario de *onboarding* de pacientes (actualiza Elastic).
*   *Testing:* Ejecución de `pytest tools/` para validar manejo de errores en cada módulo independiente.

### Sprint 3: El Cerebro y la Orquestación (Día 5)
**Objetivo:** Configurar el agente inteligente e integrar las herramientas mediante el protocolo MCP.
*   **[ ]** Desplegar entorno en **Google Cloud Agent Builder** con Gemini 3.1 Pro.
*   **[ ]** Configurar el *System Prompt* inyectando las directrices del archivo `AGENTS.md` (Grounding médico, Temperature 0).
*   **[ ]** Conectar el **Servidor MCP de Elastic** para habilitar la Búsqueda Híbrida.
*   **[ ]** Exponer los scripts de Python (Sprint 2) y conectarlos como Herramientas (Tools) en el orquestador.
*   *Testing (Red-Teaming):* Solicitar un procedimiento contraindicado para validar la activación de la "Alerta Clínica" y la negación de la acción.

### Sprint 4: UX y Conexión End-to-End (Día 6)
**Objetivo:** Cerrar el ciclo de interacción desde el frontend, aislando al usuario de la consola de desarrollo.
*   **[ ]** Diseñar y construir la interfaz de chat en Next.js.
*   **[ ]** Establecer la comunicación Frontend <-> API del Agent Builder, transmitiendo el contexto de sesión (`clinica_id`, `idioma`).
*   **[ ]** Renderizado UI: Formatear las respuestas del orquestador (Tablas de presupuesto, botones de descarga de PDF).
*   *Testing:* Flujo E2E completo -> Login médico -> Dictar caso clínico -> Aprobar receta -> Verificar notificación y registro en Elastic.

### Sprint 5: Empaquetado y Pitch (Día 7)
**Objetivo:** Cumplir con todos los entregables del hackathon maximizando el impacto en los criterios de evaluación.
*   **[ ]** Auditoría de repositorio: Confirmar visibilidad pública, archivo `LICENSE` (MIT/Apache) visible, y código limpio.
*   **[ ]** Crear `.env.example` y redactar el `README.md` final (Arquitectura técnica, solución del problema, impacto bilingüe/regional).
*   **[ ]** Grabación del Demo (3 minutos): Guion enfocado en "Problema -> Solución MCP -> Acción del Agente".
*   **[ ]** Envío del formulario de Devpost.