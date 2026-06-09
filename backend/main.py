from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import os
import json
import uuid
import logging
import traceback
from fastapi import Request
from starlette.responses import JSONResponse

# Configurar logging básico
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("odonto_oracle")

# Conector centralizado (reemplaza setup_elastic para producción)
from database import get_elastic_client, ensure_indices, PACIENTES_INDEX, ping_elasticsearch
from tools.scraper import dental_market_scraper
from tools.pdf_generator import generar_documento_clinico
from tools.notifier import enviar_notificacion_paciente
from tools.search import buscar_paciente as _buscar_paciente
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# URL pública opcional (ngrok / Cloud Run)
public_server_url = os.getenv("PUBLIC_SERVER_URL", "")
servers_config = (
    [{"url": public_server_url, "description": "Public URL"}]
    if public_server_url
    else [{"url": "http://localhost:8000", "description": "Local server"}]
)

app = FastAPI(
    title="Odonto-Oracle Backend API",
    description="Backend modular y altamente estructurado para el Agente Clínico y herramientas de soporte odontológico.",
    version="2.0.0",
    servers=servers_config,
)

allowed_origins = [
    "http://localhost:3000",
    "https://odonto-oracle.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming Request: {request.method} {request.url}")
    try:
        response = await call_next(request)
        logger.info(f"Response Status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"CRITICAL ERROR processing request {request.method} {request.url}")
        logger.error(f"Exception: {str(e)}")
        logger.error(traceback.format_exc())
        print(f"CRITICAL ERROR: {str(e)}")
        print(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"System Error: {str(e)}", "traceback": traceback.format_exc()}
        )

# Directorio de documentos estáticos (PDFs de recetas, presupuestos, etc.)
os.makedirs("static/documents", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ---------------------------------------------------------------------------
# Root Health Endpoint — requerido por Cloud Run probes y security_test H1
# ---------------------------------------------------------------------------
@app.get(
    "/",
    summary="Health check del sistema",
    description="Verifica que el backend de Odonto-Oracle está operativo y retorna la versión actual.",
    operation_id="health_check_root"
)
async def root_health():
    return {
        "status": "ok",
        "service": "Odonto-Oracle Backend API",
        "version": "2.0.0",
        "mode": "production-ready",
        "elastic_fallback": "json_local",
        "message": "El backend de Odonto-Oracle está operativo y listo para recibir solicitudes del agente."
    }

# ---------------------------------------------------------------------------
# Gestión de Ajustes (settings_{clinica_id}.json) y Números Emisores de Mensajería
# ---------------------------------------------------------------------------
def get_settings_path(clinica_id: str) -> str:
    filename = f"settings_{clinica_id}.json"
    return os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", filename))

def init_settings_file(clinica_id: str):
    """Garantiza la existencia del archivo de ajustes para números emisores y perfiles por clinica."""
    path = get_settings_path(clinica_id)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        global_path = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "settings.json"))
        default_settings = {}
        if os.path.exists(global_path):
            try:
                with open(global_path, "r", encoding="utf-8") as gf:
                    default_settings = json.load(gf)
            except Exception:
                pass
        
        base_settings = {
            "clinica_id": clinica_id,
            "twilio_whatsapp_number": "whatsapp:+14155238886",
            "twilio_sms_number": "+14155238886",
            "nombre_clinica": f"Clínica Dental {clinica_id}",
            "especialidad": "Odontología General",
            "region_scraper": "MX",
            "canal_notificacion": "email",
            "telefono_contacto": "+529511234567"
        }
        for k, v in base_settings.items():
            if k not in default_settings:
                default_settings[k] = v
        default_settings["clinica_id"] = clinica_id
        
        with open(path, "w", encoding="utf-8") as f:
            json.dump(default_settings, f, ensure_ascii=False, indent=2)
        print(f"[Settings] Inicializado settings_{clinica_id}.json con valores por defecto.")

# Inicializar al cargar el backend para la clínica por defecto
init_settings_file("OO-CLINIC-001")

class SettingsPayload(BaseModel):
    clinica_id: Optional[str] = Field("OO-CLINIC-001", description="ID de la clínica.")
    twilio_whatsapp_number: Optional[str] = Field(None, description="Número de teléfono emisor de WhatsApp en Twilio (ej. whatsapp:+14155238886).")
    twilio_sms_number: Optional[str] = Field(None, description="Número de teléfono emisor de SMS en Twilio.")
    nombre_clinica: Optional[str] = Field(None, description="Nombre formal del consultorio dental o clínica.")
    nombre_doctor: Optional[str] = Field(None, description="Nombre completo del doctor o responsable del consultorio. Se usa en recetas, presupuestos y saludos del agente.")
    especialidad: Optional[str] = Field(None, description="Especialidad clínica principal.")
    region_scraper: Optional[str] = Field(None, description="Región predeterminada para el web scraper de insumos dentales (MX o US).")
    canal_notificacion: Optional[str] = Field(None, description="Canal preferido de notificación por defecto (whatsapp, sms, email).")
    telefono_contacto: Optional[str] = Field(None, description="Número de teléfono de la clínica para contacto de pacientes (WhatsApp).")


@app.get(
    "/settings",
    summary="Obtener ajustes de la clínica",
    description="Retorna el perfil del consultorio y los números emisores de WhatsApp/SMS configurados.",
    operation_id="obtener_settings"
)
async def obtener_settings(clinica_id: str = "OO-CLINIC-001"):
    try:
        init_settings_file(clinica_id)
        path = get_settings_path(clinica_id)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {"status": "success", "settings": data}
    except Exception as e:
        return {"status": "error", "message": f"System Error: No se pudieron leer los ajustes. Detalle: {str(e)}"}

@app.post(
    "/settings",
    summary="Actualizar ajustes de la clínica",
    description="Guarda el perfil del consultorio y los números emisores de WhatsApp/SMS en el almacenamiento persistente.",
    operation_id="guardar_settings"
)
async def guardar_settings(payload: SettingsPayload):
    try:
        clinica_id = payload.clinica_id or "OO-CLINIC-001"
        init_settings_file(clinica_id)
        path = get_settings_path(clinica_id)
        with open(path, "r", encoding="utf-8") as f:
            current = json.load(f)
            
        update_data = payload.dict(exclude_unset=True)
        current.update(update_data)
        current["clinica_id"] = clinica_id
        
        with open(path, "w", encoding="utf-8") as f:
            json.dump(current, f, ensure_ascii=False, indent=2)
            
        return {
            "status": "success", 
            "message": "Configuración guardada correctamente.", 
            "settings": current,
            "db_file_path": os.path.abspath(path)
        }
    except Exception as e:
        return {"status": "error", "message": f"System Error: No se pudieron guardar los ajustes. Detalle: {str(e)}"}

# ---------------------------------------------------------------------------
# Endpoint de Métricas Clínicas Dinámicas (Tiempo Real)
# ---------------------------------------------------------------------------
@app.get(
    "/clinica/metricas",
    summary="Obtener métricas de la clínica en tiempo real",
    description="Calcula estadísticas dinámicas leyendo la base de datos de pacientes filtrada por clinica_id.",
    operation_id="obtener_metricas_clinica"
)
async def obtener_metricas_clinica(clinica_id: str = "OO-CLINIC-001"):
    try:
        from database_fallback import get_fallback_patients
        pacientes = get_fallback_patients(clinica_id)
        total_pacientes = len(pacientes)
        
        recetas_emitidas = 0
        presupuestos_generados = 0
        
        # Isolar conteo de documentos por paciente de esta clínica
        for p in pacientes:
            for doc in p.get("documentos", []):
                tipo = doc.get("tipo", "").lower()
                if "receta" in tipo:
                    recetas_emitidas += 1
                elif "presupuesto" in tipo:
                    presupuestos_generados += 1
                        
        alertas_clinicas = 0
        for p in pacientes:
            alergias = p.get("alergias", "").strip().lower()
            if alergias and alergias not in ["ninguna", "ninguno", "no", "n/a", "none", "sin alergias", "sin alergia"]:
                alertas_clinicas += 1
                
        return {
            "status": "success",
            "pacientes_atendidos": total_pacientes,
            "presupuestos_generados": presupuestos_generados,
            "recetas_emitidas": recetas_emitidas,
            "alertas_clinicas": alertas_clinicas
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error al calcular métricas: {str(e)}",
            "pacientes_atendidos": 0,
            "presupuestos_generados": 0,
            "recetas_emitidas": 0,
            "alertas_clinicas": 0
        }

# ---------------------------------------------------------------------------
# Endpoint de Agenda / Calendario (Tiempo Real)
# ---------------------------------------------------------------------------
@app.get(
    "/clinica/agenda/{clinica_id}",
    summary="Obtener agenda completa de la clínica",
    description="Devuelve todas las citas de la clínica. Intenta consultar Elasticsearch y cae en JSON local si no está activo.",
    operation_id="obtener_agenda"
)
async def obtener_agenda(clinica_id: str):
    import asyncio

    def fetch_data():
        if not clinica_id:
            return {"status": "error", "message": "clinica_id es obligatorio.", "agenda": []}

        # 1. Intentar obtener de Elasticsearch
        es = get_elastic_client()
        consultas = []
        loaded_from = "Elasticsearch"
        es_online = ping_elasticsearch(timeout=0.3)

        if es_online:
            try:
                from database import CONSULTAS_INDEX
                response = es.search(
                    index=CONSULTAS_INDEX,
                    body={
                        "query": {"term": {"clinica_id": clinica_id}},
                        "size": 500,
                        "sort": [{"fecha_consulta": {"order": "asc"}}],
                    },
                )
                consultas = [
                    {"_id": hit["_id"], **hit["_source"]}
                    for hit in response["hits"]["hits"]
                ]
            except Exception as es_err:
                print(f"[Elasticsearch] Error al buscar agenda: {es_err}. Usando fallback local JSON.")
                es = None

        # Fallback si Elastic está inactivo o no trajo resultados
        if not es or not es_online or not consultas:
            from database_fallback import get_fallback_consultations
            consultas = get_fallback_consultations(clinica_id)
            # Asegurar campo _id
            for idx, c in enumerate(consultas):
                if "_id" not in c:
                    c["_id"] = f"{c['clinica_id']}_{c['paciente_id']}_{idx}"
            loaded_from = "JSON Fallback Local"

        # 2. Enriquecer con el nombre de los pacientes para una visualización premium
        pacientes_map = {}
        if es_online:
            try:
                from database import PACIENTES_INDEX
                p_response = es.search(
                    index=PACIENTES_INDEX,
                    body={
                        "query": {"term": {"clinica_id": clinica_id}},
                        "size": 1000,
                        "_source": ["paciente_id", "nombre"]
                    }
                )
                for hit in p_response["hits"]["hits"]:
                    src = hit["_source"]
                    p_id = src.get("paciente_id")
                    p_name = src.get("nombre")
                    if p_id and p_name:
                        pacientes_map[p_id] = p_name
            except Exception as es_p_err:
                print(f"[Agenda ES] Error al mapear nombres de pacientes desde ES: {es_p_err}")

        # Fallback si no está online o no trajo resultados
        if not pacientes_map:
            try:
                from database_fallback import get_fallback_patients
                pacientes_lista = get_fallback_patients(clinica_id)
                for p in pacientes_lista:
                    pacientes_map[p.get("paciente_id")] = p.get("nombre")
            except Exception as p_err:
                print(f"[Agenda Fallback] Advertencia al mapear nombres de pacientes: {p_err}")

        # Inyectar nombre de paciente
        for c in consultas:
            p_id = c.get("paciente_id")
            c["nombre_paciente"] = pacientes_map.get(p_id, p_id)

        print(f"[API] Agenda cargada con {len(consultas)} citas para la clinica {clinica_id} ({loaded_from})")
        return {
            "status": "success",
            "total": len(consultas),
            "agenda": consultas,
            "fuente": loaded_from
        }

    try:
        # Ejecutar en hilo secundario con límite estricto de 1.5s
        res = await asyncio.wait_for(asyncio.to_thread(fetch_data), timeout=1.5)
        return res
    except asyncio.TimeoutError:
        print("[Agenda Timeout] La base de datos tardó demasiado. Retornando agenda vacía estructurada de inmediato.")
        return {
            "status": "success",
            "total": 0,
            "agenda": [],
            "fuente": "Empty Fallback (Timeout)"
        }
    except Exception as e:
        print(f"[Agenda Error] Error inesperado en el endpoint de la agenda: {e}")
        return {
            "status": "success",
            "total": 0,
            "agenda": [],
            "fuente": f"Empty Fallback (Error: {str(e)})"
        }

# ---------------------------------------------------------------------------
# Arranque: garantizar índices en Elasticsearch
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup_event():
    """Crea los índices de Elasticsearch si no existen al arrancar la API."""
    print("Iniciando verificación de índices en Elasticsearch...")
    resultado = ensure_indices()
    print(resultado)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get(
    "/health",
    summary="Verificar salud de la API",
    description="Retorna el estado operativo de los servicios del backend de Odonto-Oracle.",
    operation_id="health_check"
)
async def health_check():
    return {"status": "ok", "service": "odonto-oracle-api", "version": "2.0.0"}


@app.get(
    "/test/read_db",
    summary="Endpoint temporal para verificar base de datos local JSON",
    description="Devuelve el estado crudo completo de la base de datos local JSON de citas, pacientes y precios.",
    operation_id="test_read_db"
)
async def test_read_db():
    from database_fallback import load_patients, load_consultations, load_prices
    return {
        "status": "success",
        "pacientes": load_patients(),
        "consultas": load_consultations(),
        "precios": load_prices()
    }



# ---------------------------------------------------------------------------
# Webhook de Paciente — CRUD real contra Elasticsearch
# ---------------------------------------------------------------------------

class PacientePayload(BaseModel):
    clinica_id: str = Field(
        ...,
        description="Identificador único de la clínica (tenant) para garantizar el aislamiento Multi-Tenant de los datos."
    )
    paciente_id: Optional[str] = Field(
        None,
        description="Identificador clínico único del paciente. Dejar en nulo si es un nuevo registro; se autogenerará."
    )
    nombre: str = Field(
        ...,
        description="Nombre completo del paciente (Nombres y Apellidos) para propósitos de registro y búsqueda."
    )
    telefono: Optional[str] = Field(
        None,
        description="Número de teléfono móvil del paciente con código de país (ej. '+529511234567') para notificaciones."
    )
    email: Optional[str] = Field(
        None,
        description="Correo electrónico de contacto para envío de presupuestos u hojas de tratamiento."
    )
    fecha_nacimiento: Optional[str] = Field(
        None,
        description="Fecha de nacimiento del paciente en formato estándar ISO YYYY-MM-DD."
    )
    historial_medico: Optional[str] = Field(
        "",
        description="Antecedentes médicos relevantes, patologías previas o historial clínico de importancia."
    )
    alergias: Optional[str] = Field(
        "",
        description="Alergias médicas declaradas (ej. Penicilina, Látex, Anestésicos) críticas para la seguridad del paciente."
    )
    medicamentos_actuales: Optional[str] = Field(
        "",
        description="Medicamentos o fármacos que el paciente consume actualmente de forma regular."
    )
    enfermedades_cronicas: Optional[str] = Field(
        "",
        description="Enfermedades crónicas declaradas por el paciente (ej. Diabetes, Hipertensión)."
    )
    vitales: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Valores de signos vitales (presión arterial, frecuencia cardiaca, oxigenación, temperatura, peso, etc.)."
    )


@app.post(
    "/webhook/paciente",
    summary="Registrar o actualizar paciente",
    description="Registra un nuevo paciente o actualiza su información clínica (antecedentes, alergias, vitales) en Elasticsearch y base local JSON. "
                "Este endpoint debe ser invocado por el agente en la nube o la interfaz de usuario cuando se requiera realizar el onboarding de un paciente "
                "o actualizar su ficha médica con nuevos signos vitales o antecedentes clínicos. Devuelve un JSON estructurado.",
    operation_id="registrar_paciente"
)
async def webhook_paciente(payload: PacientePayload):
    try:
        if not payload.clinica_id:
            return {"status": "error", "message": "El clinica_id es obligatorio para el aislamiento Multi-Tenant."}

        # Validación de duplicados para nuevos registros
        if not payload.paciente_id:
            from database_fallback import load_patients
            existing_patients = load_patients()
            clinic_patients = [p for p in existing_patients if p.get("clinica_id") == payload.clinica_id]
            
            nombre_nuevo = payload.nombre.lower().strip()
            telefono_nuevo = payload.telefono.strip() if payload.telefono else ""
            email_nuevo = payload.email.lower().strip() if payload.email else ""
            
            for p in clinic_patients:
                if (p.get("nombre") or "").lower().strip() == nombre_nuevo:
                    return {
                        "status": "error",
                        "message": f"Duplicado: Ya existe un paciente registrado con el nombre '{payload.nombre}' en esta clínica."
                    }
                if telefono_nuevo and (p.get("telefono") or "").strip() == telefono_nuevo:
                    return {
                        "status": "error",
                        "message": f"Duplicado: El número de teléfono '{payload.telefono}' ya está registrado con el paciente '{p.get('nombre')}'."
                    }
                if email_nuevo and (p.get("email") or "").lower().strip() == email_nuevo:
                    return {
                        "status": "error",
                        "message": f"Duplicado: El correo electrónico '{payload.email}' ya está registrado con el paciente '{p.get('nombre')}'."
                    }

        # Usar paciente_id o generar uno si es nuevo
        pid = payload.paciente_id
        if not pid:
            pid = f"P-{uuid.uuid4().hex[:8]}"
            payload.paciente_id = pid

        doc = payload.dict()
        
        # 1. Guardar en base JSON local (Fallback y persistencia garantizada)
        merged_doc = doc
        try:
            from database_fallback import save_fallback_patient
            merged_doc = save_fallback_patient(doc)
            json_saved = True
        except Exception as fallback_err:
            print(f"[JSON DB Fallback] Error al guardar paciente: {fallback_err}")
            json_saved = False

        # 2. Guardar en Elasticsearch (Principal)
        es = get_elastic_client()
        es_saved = False
        es_online = False
        try:
            es_online = es.ping()
        except Exception:
            es_online = False
        if es_online:
            try:
                doc_es = merged_doc.copy()
                if "_id" in doc_es:
                    del doc_es["_id"]
                es.index(
                    index=PACIENTES_INDEX,
                    id=f"{payload.clinica_id}_{pid}",
                    document=doc_es,
                    refresh=True,
                )
                es_saved = True
            except Exception as es_err:
                print(f"[Elasticsearch] Error al guardar en index: {es_err}")

        from database_fallback import PACIENTES_JSON_PATH
        return {
            "status": "success",
            "data": {
                "paciente_id": pid,
                "clinica_id": payload.clinica_id,
                "db_file_path": PACIENTES_JSON_PATH,
                "paciente": merged_doc,
                "persistencia": {"elastic": es_saved, "json_local": json_saved}
            },
            "message": f"Paciente '{payload.nombre}' registrado y persistido exitosamente."
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": f"No se pudo registrar el paciente. Detalle: {str(e)}"}


# ---------------------------------------------------------------------------
# Lectura: Lista completa de pacientes de una clínica
# ---------------------------------------------------------------------------

@app.get(
    "/pacientes/{clinica_id}",
    summary="Listar todos los pacientes de la clínica",
    description="Devuelve todos los pacientes registrados bajo un clinica_id específico. Requerido por la tabla del dashboard de React para carga inicial.",
    operation_id="listar_pacientes"
)
async def listar_pacientes(clinica_id: str):
    try:
        if not clinica_id:
            raise HTTPException(status_code=400, detail="clinica_id es obligatorio.")

        es = get_elastic_client()
        pacientes = []
        loaded_from = "Elasticsearch"
        es_online = False
        try:
            es_online = es.ping()
        except Exception:
            es_online = False

        if es_online:
            try:
                response = es.search(
                    index=PACIENTES_INDEX,
                    body={
                        "query": {"term": {"clinica_id": clinica_id}},
                        "size": 200,
                        "sort": [{"_score": {"order": "desc"}}],
                    },
                )
                pacientes = [
                    {"_id": hit["_id"], **hit["_source"]}
                    for hit in response["hits"]["hits"]
                ]
            except Exception as es_err:
                print(f"[Elasticsearch] Error al buscar pacientes: {es_err}. Usando fallback local JSON.")
                es_online = False

        # Fallback si Elastic está inactivo o devolvió vacío
        if not es or not es_online or not pacientes:
            from database_fallback import get_fallback_patients
            pacientes = get_fallback_patients(clinica_id)
            # Asegurar campo _id
            for p in pacientes:
                if "_id" not in p:
                    p["_id"] = f"{p['clinica_id']}_{p['paciente_id']}"
            loaded_from = "JSON Fallback Local"

        print(f"[API] Cargados {len(pacientes)} pacientes desde {loaded_from} para la clinica {clinica_id}")
        return {"status": "success", "total": len(pacientes), "pacientes": pacientes, "fuente": loaded_from}

    except Exception as e:
        return {"status": "error", "message": f"Error al listar pacientes: {str(e)}", "pacientes": []}


@app.get(
    "/pacientes/{clinica_id}/{paciente_id}",
    summary="Obtener expediente de un paciente específico",
    description="Devuelve el expediente clínico detallado y actualizado de un paciente específico (antecedentes, alergias, vitales, historial de documentos).",
    operation_id="obtener_paciente"
)
async def obtener_paciente(clinica_id: str, paciente_id: str):
    try:
        if not clinica_id or not paciente_id:
            raise HTTPException(status_code=400, detail="clinica_id y paciente_id son obligatorios.")
            
        es = get_elastic_client()
        paciente = None
        loaded_from = "Elasticsearch"
        es_online = False
        try:
            es_online = es.ping()
        except Exception:
            es_online = False
        
        if es_online:
            try:
                doc_id = f"{clinica_id}_{paciente_id}"
                response = es.get(index=PACIENTES_INDEX, id=doc_id)
                paciente = {"_id": response["_id"], **response["_source"]}
            except Exception as es_err:
                print(f"[Elasticsearch] Error al buscar paciente {paciente_id}: {es_err}. Usando fallback local JSON.")
                es_online = False
                
        if not es or not es_online or not paciente:
            from database_fallback import load_patients
            pacientes = load_patients()
            for p in pacientes:
                if p.get("clinica_id") == clinica_id and p.get("paciente_id") == paciente_id:
                    paciente = p
                    if "_id" not in paciente:
                        paciente["_id"] = f"{clinica_id}_{paciente_id}"
                    break
            loaded_from = "JSON Fallback Local"
            
        if not paciente:
            return {"status": "error", "message": f"No se encontró al paciente '{paciente_id}' en la clínica '{clinica_id}'."}
            
        return {"status": "success", "paciente": paciente, "fuente": loaded_from}
    except Exception as e:
        return {"status": "error", "message": f"Error al obtener expediente: {str(e)}"}


# ---------------------------------------------------------------------------
# Herramienta: Buscar Paciente por nombre
# ---------------------------------------------------------------------------

class SearchPatientPayload(BaseModel):
    nombre: str = Field(
        ...,
        description="Nombre o apellido (completo o parcial) del paciente a buscar en los registros clínicos."
    )
    clinica_id: Optional[str] = Field(
        "OO-CLINIC-001",
        description="Identificador de la clínica del tenant activo para aislar la búsqueda de datos."
    )


@app.post(
    "/tools/search_patient",
    summary="Buscar expediente de paciente",
    description="Busca un paciente en el directorio de Elasticsearch de la clínica actual por su nombre o apellidos. "
                "Retorna sus datos personales, historial clínico, medicamentos, alergias y signos vitales. "
                "El agente LLM DEBE invocar esta herramienta obligatoriamente antes de generar una receta, plan de tratamiento o presupuesto "
                "para comprobar que el paciente existe y obtener sus datos correctos. No inventar nunca datos del paciente.",
    operation_id="buscar_paciente"
)
async def search_patient_tool(payload: SearchPatientPayload):
    res = _buscar_paciente(payload.nombre, payload.clinica_id)
    if isinstance(res, str) and ("System Error" in res or "No se encontraron pacientes" in res):
        print(f"[API] _buscar_paciente falló ({res}). Intentando búsqueda en base local JSON...")
        from database_fallback import search_fallback_patient
        p = search_fallback_patient(payload.nombre, payload.clinica_id)
        if p:
            from database_fallback import PACIENTES_JSON_PATH
            return {
                "status": "success",
                "data": {
                    "paciente": p,
                    "total": 1,
                    "fuente": "JSON Fallback Local",
                    "db_file_path": PACIENTES_JSON_PATH
                },
                "message": f"Paciente '{p.get('nombre')}' encontrado exitosamente en la base de datos local."
            }
        else:
            return {
                "status": "error",
                "message": f"No se encontró ningún expediente para el paciente '{payload.nombre}' en los registros de la clínica."
            }
    
    if isinstance(res, str):
        return {
            "status": "error",
            "message": f"No se pudo completar la búsqueda del paciente. Detalle: {res}"
        }
        
    if isinstance(res, dict) and res.get("status") == "success":
        from database_fallback import PACIENTES_JSON_PATH
        p = res.get("paciente")
        return {
            "status": "success",
            "data": {
                "paciente": p,
                "total": res.get("total", 1),
                "fuente": res.get("fuente", "Elasticsearch"),
                "db_file_path": PACIENTES_JSON_PATH
            },
            "message": f"Expediente del paciente '{p.get('nombre')}' cargado correctamente."
        }
        
    return {
        "status": "error",
        "message": f"Error inesperado al buscar al paciente '{payload.nombre}'."
    }


# ---------------------------------------------------------------------------
# Herramienta: Agendar Cita
# ---------------------------------------------------------------------------

class ScheduleAppointmentPayload(BaseModel):
    clinica_id: str = Field(
        "OO-CLINIC-001",
        description="Identificador único de la clínica."
    )
    paciente_id: str = Field(
        ...,
        description="ID clínico del paciente (ej. 'P-CSLIM001' o 'P-ARMANDO01')."
    )
    fecha_consulta: str = Field(
        ...,
        description="Fecha y hora de la cita programada en formato ISO YYYY-MM-DD o YYYY-MM-DD HH:MM."
    )
    diagnostico: Optional[str] = Field(
        "",
        description="Motivo de la cita o diagnóstico preliminar (ej. 'Profilaxis y limpieza general')."
    )
    tratamiento: Optional[str] = Field(
        "",
        description="Tratamiento odontológico agendado o planeado para la cita."
    )
    notas_adicionales: Optional[str] = Field(
        "",
        description="Notas clínicas o administrativas adicionales para la cita."
    )


@app.post(
    "/tools/schedule_appointment",
    summary="Agendar cita o consulta dental",
    description="Registra una nueva cita odontológica en Elasticsearch (índice consultas_produccion) y base de datos local JSON. "
                "Retorna confirmación del agendamiento. El agente LLM debe invocar este endpoint cuando el doctor "
                "indique explícitamente programar o agendar una cita para un paciente.",
    operation_id="agendar_cita"
)
async def schedule_appointment_tool(payload: ScheduleAppointmentPayload):
    try:
        doc = payload.dict()

        # Guardrail contra Doble Agendamiento
        try:
            from database_fallback import get_fallback_consultations
            existing = get_fallback_consultations(payload.clinica_id)
            
            def normalize_datetime(dt_str: str) -> str:
                if not dt_str:
                    return ""
                dt_str = dt_str.strip().replace("T", " ")
                parts = dt_str.split(" ")
                if len(parts) == 1:
                    return parts[0]
                time_parts = parts[1].split(":")
                if len(time_parts) >= 2:
                    return f"{parts[0]} {time_parts[0]}:{time_parts[1]}"
                return dt_str

            nueva_norm = normalize_datetime(payload.fecha_consulta)
            
            for c in existing:
                c_norm = normalize_datetime(c.get("fecha_consulta", ""))
                if c_norm and c_norm == nueva_norm:
                    dt_parts = nueva_norm.split(" ")
                    if len(dt_parts) == 2:
                        msg = f"Conflicto de agenda: Ya existe una cita programada para el {dt_parts[0]} a las {dt_parts[1]}. Por favor, sugiera otro horario al doctor."
                    else:
                        msg = f"Conflicto de agenda: Ya existe una cita programada para el {dt_parts[0]}. Por favor, sugiera otro horario al doctor."
                    
                    return {
                        "status": "error",
                        "message": msg
                    }
        except Exception as guardrail_err:
            print(f"[Guardrail Collision Check] Error: {guardrail_err}")

        # Generar ID de cita único y COMPARTIDO entre JSON y Elasticsearch
        c_id = f"{payload.clinica_id}_{payload.paciente_id}_{uuid.uuid4().hex[:8]}"
        doc["_id"] = c_id
        doc["id"] = c_id

        # 1. Guardar en base JSON local (con el mismo c_id)
        try:
            from database_fallback import save_fallback_consultation
            save_fallback_consultation(doc)
            json_saved = True
        except Exception as fallback_err:
            print(f"[JSON DB Fallback] Error al agendar consulta: {fallback_err}")
            json_saved = False

        # 2. Guardar en Elasticsearch con el mismo ID
        es = get_elastic_client()
        es_saved = False
        es_online = False
        try:
            es_online = es.ping()
        except Exception:
            es_online = False
        if es_online:
            try:
                from database import CONSULTAS_INDEX
                # Sanitizar fecha_consulta para cumplir con el formato estricto ISO 8601
                doc_elastic = doc.copy()
                if "_id" in doc_elastic:
                    del doc_elastic["_id"]
                fecha_sanitizada = payload.fecha_consulta.strip()
                if " " in fecha_sanitizada:
                    fecha_sanitizada = fecha_sanitizada.replace(" ", "T")
                    time_part = fecha_sanitizada.split("T")[1]
                    if len(time_part.split(":")) == 2:
                        fecha_sanitizada += ":00"
                doc_elastic["fecha_consulta"] = fecha_sanitizada

                es.index(
                    index=CONSULTAS_INDEX,
                    id=c_id,
                    document=doc_elastic,
                    refresh=True,
                )
                es_saved = True
            except Exception as es_err:
                print(f"[Elasticsearch] Error al agendar en index: {es_err}")

        from database_fallback import CONSULTAS_JSON_PATH
        return {
            "status": "success",
            "data": {
                "fecha_consulta": payload.fecha_consulta,
                "paciente_id": payload.paciente_id,
                "appointment_id": c_id,
                "persistencia": {"elastic": es_saved, "json_local": json_saved},
                "db_file_path": CONSULTAS_JSON_PATH,
                "cita": doc
            },
            "message": f"Cita para el paciente '{payload.paciente_id}' agendada exitosamente para el {payload.fecha_consulta}."
        }

    except Exception as e:
        return {"status": "error", "message": f"No se pudo agendar la cita. Detalle: {str(e)}"}


# ---------------------------------------------------------------------------
# Herramientas: Modificar y Cancelar Citas
# ---------------------------------------------------------------------------

class ModifyAppointmentPayload(BaseModel):
    clinica_id: str = Field("OO-CLINIC-001", description="Identificador único de la clínica.")
    appointment_id: str = Field(..., description="ID de la cita a modificar (ej. 'C-...').")
    fecha_consulta: Optional[str] = Field(None, description="Nueva fecha y hora de la cita.")
    diagnostico: Optional[str] = Field(None, description="Nuevo diagnóstico o motivo.")
    tratamiento: Optional[str] = Field(None, description="Nuevo tratamiento.")
    notas_adicionales: Optional[str] = Field(None, description="Nuevas notas clínicas.")


class CancelAppointmentPayload(BaseModel):
    clinica_id: str = Field("OO-CLINIC-001", description="Identificador único de la clínica.")
    appointment_id: str = Field(..., description="ID de la cita a cancelar.")


@app.post(
    "/tools/modify_appointment",
    summary="Modificar cita o consulta dental",
    description="Actualiza campos específicos de una cita odontológica existente en Elasticsearch y base de datos local JSON.",
    operation_id="modificar_cita"
)
async def modify_appointment_tool(payload: ModifyAppointmentPayload):
    try:
        from database_fallback import update_fallback_consultation
        
        # 1. Actualizar en local JSON
        update_data = payload.dict(exclude_unset=True)
        update_data.pop("clinica_id", None)
        update_data.pop("appointment_id", None)
        json_updated = update_fallback_consultation(payload.appointment_id, payload.clinica_id, update_data)
        
        # 2. Actualizar en Elasticsearch
        es = get_elastic_client()
        es_updated = False
        es_online = False
        try:
            es_online = es.ping()
        except Exception:
            es_online = False
            
        if es_online:
            try:
                from database import CONSULTAS_INDEX
                es_doc = {}
                if payload.fecha_consulta:
                    fecha_sanitizada = payload.fecha_consulta.strip()
                    if " " in fecha_sanitizada:
                        fecha_sanitizada = fecha_sanitizada.replace(" ", "T")
                        time_part = fecha_sanitizada.split("T")[1]
                        if len(time_part.split(":")) == 2:
                            fecha_sanitizada += ":00"
                    es_doc["fecha_consulta"] = fecha_sanitizada
                if payload.diagnostico is not None:
                    es_doc["diagnostico"] = payload.diagnostico
                if payload.tratamiento is not None:
                    es_doc["tratamiento"] = payload.tratamiento
                if payload.notas_adicionales is not None:
                    es_doc["notas_adicionales"] = payload.notas_adicionales
                
                if es_doc:
                    es.update(
                        index=CONSULTAS_INDEX,
                        id=payload.appointment_id,
                        body={"doc": es_doc}
                    )
                    es_updated = True
            except Exception as es_err:
                print(f"[Elasticsearch] Error al actualizar cita: {es_err}")

        return {
            "status": "success",
            "data": {
                "appointment_id": payload.appointment_id,
                "persistencia": {"elastic": es_updated, "json_local": json_updated}
            },
            "message": f"Cita '{payload.appointment_id}' modificada exitosamente."
        }
    except Exception as e:
        return {"status": "error", "message": f"No se pudo modificar la cita. Detalle: {str(e)}"}


@app.post(
    "/tools/cancel_appointment",
    summary="Cancelar cita o consulta dental",
    description="Elimina una cita de la base de datos local JSON y Elasticsearch.",
    operation_id="cancelar_cita"
)
async def cancel_appointment_tool(payload: CancelAppointmentPayload):
    try:
        from database_fallback import delete_fallback_consultation
        
        # 1. Eliminar de local JSON (por id o _id)
        json_deleted = delete_fallback_consultation(payload.appointment_id, payload.clinica_id)
        
        # 2. Eliminar de Elasticsearch
        es = get_elastic_client()
        es_deleted = False
        es_online = False
        try:
            es_online = es.ping()
        except Exception:
            es_online = False
            
        if es_online:
            from database import CONSULTAS_INDEX
            # Intento 1: eliminar por ID directo
            try:
                es.delete(index=CONSULTAS_INDEX, id=payload.appointment_id)
                es_deleted = True
            except Exception:
                pass
            
            # Intento 2: si el _id de ES es distinto, buscar por term y eliminar
            if not es_deleted:
                try:
                    search_res = es.search(
                        index=CONSULTAS_INDEX,
                        body={
                            "query": {
                                "bool": {
                                    "must": [
                                        {"term": {"clinica_id": payload.clinica_id}},
                                        {"bool": {"should": [
                                            {"term": {"_id": payload.appointment_id}},
                                            {"term": {"id": payload.appointment_id}},
                                        ]}}
                                    ]
                                }
                            },
                            "size": 5
                        }
                    )
                    hits = search_res["hits"]["hits"]
                    for hit in hits:
                        try:
                            es.delete(index=CONSULTAS_INDEX, id=hit["_id"])
                            es_deleted = True
                        except Exception as del_err:
                            print(f"[ES] Error eliminando hit {hit['_id']}: {del_err}")
                except Exception as search_err:
                    print(f"[Elasticsearch] Error al buscar cita para eliminar: {search_err}")

        return {
            "status": "success",
            "data": {
                "appointment_id": payload.appointment_id,
                "persistencia": {"elastic": es_deleted, "json_local": json_deleted}
            },
            "message": f"Cita '{payload.appointment_id}' cancelada exitosamente."
        }
    except Exception as e:
        return {"status": "error", "message": f"No se pudo cancelar la cita. Detalle: {str(e)}"}


class CompleteAppointmentPayload(BaseModel):
    clinica_id: str = Field("OO-CLINIC-001", description="Identificador único de la clínica.")
    appointment_id: str = Field(..., description="ID de la cita a marcar como completada.")
    diagnostico: Optional[str] = Field(None, description="Diagnóstico final clínico.")
    tratamiento: Optional[str] = Field(None, description="Tratamiento realizado.")
    notas_adicionales: Optional[str] = Field(None, description="Notas clínicas adicionales.")


@app.post(
    "/tools/complete_appointment",
    summary="Marcar cita como completada o consultada",
    description="Actualiza el estado de una cita odontológica a 'completada' en Elasticsearch y base de datos local JSON.",
    operation_id="completar_cita"
)
async def complete_appointment_tool(payload: CompleteAppointmentPayload):
    try:
        from database_fallback import update_fallback_consultation
        from datetime import datetime
        
        # 1. Actualizar en local JSON
        update_data = {
            "estado": "completada",
            "fecha_completada": datetime.now().isoformat()
        }
        if payload.diagnostico is not None:
            update_data["diagnostico"] = payload.diagnostico
        if payload.tratamiento is not None:
            update_data["tratamiento"] = payload.tratamiento
        if payload.notas_adicionales is not None:
            update_data["notas_adicionales"] = payload.notas_adicionales
            
        json_updated = update_fallback_consultation(payload.appointment_id, payload.clinica_id, update_data)
        
        # 2. Actualizar en Elasticsearch
        es = get_elastic_client()
        es_updated = False
        es_online = False
        try:
            es_online = es.ping()
        except Exception:
            es_online = False
            
        if es_online:
            try:
                from database import CONSULTAS_INDEX
                es_doc = {
                    "estado": "completada",
                    "fecha_completada": datetime.now().isoformat()
                }
                if payload.diagnostico is not None:
                    es_doc["diagnostico"] = payload.diagnostico
                if payload.tratamiento is not None:
                    es_doc["tratamiento"] = payload.tratamiento
                if payload.notas_adicionales is not None:
                    es_doc["notas_adicionales"] = payload.notas_adicionales
                
                es.update(
                    index=CONSULTAS_INDEX,
                    id=payload.appointment_id,
                    body={"doc": es_doc}
                )
                es_updated = True
            except Exception as es_err:
                print(f"[Elasticsearch] Error al marcar cita como completada: {es_err}")

        return {
            "status": "success",
            "data": {
                "appointment_id": payload.appointment_id,
                "persistencia": {"elastic": es_updated, "json_local": json_updated}
            },
            "message": f"Cita '{payload.appointment_id}' marcada como completada exitosamente."
        }
    except Exception as e:
        return {"status": "error", "message": f"No se pudo completar la cita. Detalle: {str(e)}"}


class DeletePacientePayload(BaseModel):
    clinica_id: str = Field(..., description="ID de la clínica (tenant) para aislar la eliminación.")
    paciente_id: str = Field(..., description="ID del paciente a eliminar.")


@app.post(
    "/tools/delete_patient",
    summary="Eliminar paciente y expediente clínico",
    description="Elimina un paciente, su expediente y todas sus citas de la base local JSON y Elasticsearch.",
    operation_id="eliminar_paciente"
)
async def delete_patient_tool(payload: DeletePacientePayload):
    try:
        from database_fallback import delete_fallback_patient
        
        # 1. Eliminar de local JSON (por paciente_id y clinica_id)
        json_deleted = delete_fallback_patient(payload.paciente_id, payload.clinica_id)
        
        # 2. Eliminar de Elasticsearch (Pacientes y Citas)
        es = get_elastic_client()
        es_patient_deleted = False
        es_appointments_deleted = False
        es_online = False
        try:
            es_online = es.ping()
        except Exception:
            es_online = False
            
        if es_online:
            from database import PACIENTES_INDEX, CONSULTAS_INDEX
            
            # A. Eliminar el documento del paciente
            try:
                es.delete(index=PACIENTES_INDEX, id=f"{payload.clinica_id}_{payload.paciente_id}")
                es_patient_deleted = True
            except Exception:
                pass
                
            if not es_patient_deleted:
                try:
                    search_res = es.search(
                        index=PACIENTES_INDEX,
                        body={
                            "query": {
                                "bool": {
                                    "must": [
                                        {"term": {"clinica_id": payload.clinica_id}},
                                        {"term": {"paciente_id": payload.paciente_id}}
                                    ]
                                }
                            }
                        }
                    )
                    hits = search_res["hits"]["hits"]
                    for hit in hits:
                        try:
                            es.delete(index=PACIENTES_INDEX, id=hit["_id"])
                            es_patient_deleted = True
                        except Exception:
                            pass
                except Exception as es_err:
                    print(f"[ES] Error buscando paciente para eliminar: {es_err}")

            # B. Eliminar citas asociadas en ES
            try:
                search_res = es.search(
                    index=CONSULTAS_INDEX,
                    body={
                        "query": {
                            "bool": {
                                "must": [
                                    {"term": {"clinica_id": payload.clinica_id}},
                                    {"term": {"paciente_id": payload.paciente_id}}
                                ]
                            }
                        },
                        "size": 500
                    }
                )
                hits = search_res["hits"]["hits"]
                for hit in hits:
                    try:
                        es.delete(index=CONSULTAS_INDEX, id=hit["_id"])
                    except Exception:
                        pass
                es_appointments_deleted = True
            except Exception as es_err:
                print(f"[ES] Error eliminando citas asociadas al paciente: {es_err}")

        return {
            "status": "success",
            "data": {
                "paciente_id": payload.paciente_id,
                "persistencia": {
                    "elastic_paciente": es_patient_deleted, 
                    "elastic_citas": es_appointments_deleted,
                    "json_local": json_deleted
                }
            },
            "message": f"Paciente '{payload.paciente_id}' y sus citas asociadas eliminados exitosamente."
        }
    except Exception as e:
        return {"status": "error", "message": f"No se pudo eliminar el paciente. Detalle: {str(e)}"}


@app.get(
    "/tools/search_paciente",
    summary="Buscar expediente de paciente (GET legado)",
    description="Endpoint GET heredado para buscar pacientes. Mantenido por compatibilidad.",
    operation_id="buscar_paciente_legacy"
)
async def search_paciente_get(clinica_id: str, query: str):
    res = _buscar_paciente(query, clinica_id)
    if isinstance(res, str):
        return {
            "status": "error",
            "message": f"No se encontró o no se pudo buscar al paciente '{query}': {res}"
        }
    if isinstance(res, dict) and res.get("status") == "success":
        from database_fallback import PACIENTES_JSON_PATH
        p = res.get("paciente")
        return {
            "status": "success",
            "data": {
                "paciente": p,
                "total": res.get("total", 1),
                "fuente": res.get("fuente", "Elasticsearch"),
                "db_file_path": PACIENTES_JSON_PATH
            },
            "message": f"Expediente del paciente '{p.get('nombre')}' cargado correctamente."
        }
    return {
        "status": "error",
        "message": f"Error inesperado al buscar al paciente '{query}'."
    }


# ---------------------------------------------------------------------------
# Herramienta: Scraping de precios
# ---------------------------------------------------------------------------

class ScraperPayload(BaseModel):
    material_dental: str = Field(
        ...,
        description="Nombre específico del material dental, insumo o equipo a cotizar (ej. 'Resina Z350 de 3M')."
    )
    region: Optional[str] = Field(
        "MX",
        description="Región geográfica para realizar la cotización de precios: 'MX' para depósitos de México o 'US' para Estados Unidos."
    )


@app.post(
    "/tools/scraper",
    summary="Escanear precios de mercado de materiales",
    description="Realiza web scraping en tiempo real en depósitos dentales de la región especificada ('MX' o 'US') para buscar el precio comparativo de un insumo o material dental. "
                "Guarda el registro en el histórico y devuelve un JSON con productos, precios y enlaces. "
                "El agente LLM debe invocar este endpoint cuando el doctor solicite cotizar o buscar precios de un material dental.",
    operation_id="buscar_precios_material"
)
async def run_scraper_tool(payload: ScraperPayload):
    try:
        res = dental_market_scraper(payload.material_dental, payload.region)
        from database_fallback import PRECIOS_JSON_PATH
        data = json.loads(res)
        return {
            "status": "success", 
            "data": {
                "material": payload.material_dental, 
                "region": payload.region, 
                "db_file_path": PRECIOS_JSON_PATH,
                "resultados_busqueda": data.get("resultados_busqueda", []),
                "mejor_precio": data.get("mejor_precio"),
                "fuente": data.get("fuente", "Scraper Offline / Cache")
            },
            "message": f"Búsqueda finalizada con éxito. Se escanearon y encontraron {len(data.get('resultados_busqueda', []))} cotizaciones para '{payload.material_dental}' en la región {payload.region}."
        }
    except Exception as e:
        return {"status": "error", "message": f"No se pudo escanear precios para '{payload.material_dental}'. Detalle: {str(e)}"}


# ---------------------------------------------------------------------------
# Herramienta: Generación de PDFs clínicos
# ---------------------------------------------------------------------------

class PDFPayload(BaseModel):
    tipo_documento: str = Field(
        ...,
        description="Tipo de documento clínico o administrativo a generar: 'receta', 'presupuesto' o 'tratamiento'."
    )
    datos_paciente: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Diccionario completo con los datos del paciente (nombre, paciente_id, alergias) recuperados previamente mediante buscar_paciente."
    )
    contenido_medico: str = Field(
        ...,
        description="Contenido detallado del documento: medicamentos recetados, diagnóstico, partidas de cotización o plan de tratamiento detallado."
    )
    idioma: Optional[str] = Field(
        "es",
        description="Idioma en el que se estructurará el archivo PDF generado: 'es' para español o 'en' para inglés."
    )


@app.post(
    "/tools/pdf_generator",
    summary="Generar documento clínico en PDF",
    description="Genera un archivo PDF físico elegante y profesional (receta médica, presupuesto dental formal o plan de tratamiento) con los datos del paciente e información detallada. "
                "Guarda el archivo en un directorio estático público y devuelve su URL de descarga. "
                "El agente LLM debe llamar a esta herramienta una vez haya recopilado la información del paciente y los precios para consolidar el archivo y presentárselo al doctor.",
    operation_id="generar_documento_clinico"
)
async def run_pdf_generator_tool(payload: PDFPayload):
    try:
        # Desempaquetado recursivo resiliente: Gemini puede anidar en múltiples niveles
        # Ej: {"status":"success","data":{"paciente":{...}}} o {"paciente":{...}}
        datos = payload.datos_paciente or {}
        for _ in range(5):
            if not isinstance(datos, dict):
                break
            if "paciente" in datos and isinstance(datos["paciente"], dict):
                datos = datos["paciente"]
            elif "data" in datos and isinstance(datos["data"], dict):
                datos = datos["data"]
            else:
                break
        # Garantizar que clinica_id siempre esté presente en el PDF
        if not datos.get("clinica_id"):
            datos["clinica_id"] = "OO-CLINIC-001"

        res = generar_documento_clinico(
            payload.tipo_documento,
            datos,
            payload.contenido_medico,
            payload.idioma,
        )

        if "Success" in res:
            parts = res.split("URL de descarga:")
            url = parts[1].strip() if len(parts) > 1 else ""
            
            # Archivamiento automático en el expediente del paciente
            try:
                from database_fallback import load_patients, save_fallback_patient, search_fallback_patient
                
                p_id = datos.get("paciente_id") or datos.get("id")
                c_id = datos.get("clinica_id", "OO-CLINIC-001")
                nombre_paciente = datos.get("nombre")
                
                # Resiliencia: si no tenemos paciente_id pero sí el nombre, lo buscamos en la BD
                if not p_id and nombre_paciente:
                    paciente_encontrado = search_fallback_patient(nombre_paciente, c_id)
                    if paciente_encontrado:
                        p_id = paciente_encontrado.get("paciente_id")
                        print(f"[PDF ARCHIVE] Paciente encontrado por nombre '{nombre_paciente}': ID={p_id}")
                
                # Si aún no lo encontramos ni tenemos ID, generamos uno nuevo y lo registramos
                if not p_id:
                    p_id = f"P-{uuid.uuid4().hex[:8]}"
                    print(f"[PDF ARCHIVE] No se pudo determinar el paciente_id. Se autogeneró ID temporal: {p_id}")
                
                # Obtener expediente actual
                pacientes = load_patients()
                paciente_actual = None
                for p in pacientes:
                    if p.get("clinica_id") == c_id and p.get("paciente_id") == p_id:
                        paciente_actual = p
                        break
                        
                if not paciente_actual:
                    # Crear nuevo registro base si no existe en la base de datos
                    paciente_actual = {
                        "clinica_id": c_id,
                        "paciente_id": p_id,
                        "nombre": nombre_paciente or "Paciente Desconocido",
                        "telefono": datos.get("telefono") or "",
                        "email": datos.get("email") or "",
                        "fecha_nacimiento": datos.get("fecha_nacimiento"),
                        "alergias": datos.get("alergias") or "Ninguna",
                        "historial_medico": datos.get("historial_medico") or "",
                        "enfermedades_cronicas": datos.get("enfermedades_cronicas") or "",
                        "medicamentos_actuales": datos.get("medicamentos_actuales") or "",
                        "vitales": datos.get("vitales") or {},
                        "documentos": []
                    }
                
                if "documentos" not in paciente_actual or not isinstance(paciente_actual["documentos"], list):
                    paciente_actual["documentos"] = []
                    
                from datetime import datetime
                nuevo_doc = {
                    "tipo": payload.tipo_documento,
                    "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "url": url,
                    "contenido": payload.contenido_medico
                }
                paciente_actual["documentos"].append(nuevo_doc)
                
                # Guardar explícitamente en el JSON fallback de pacientes
                save_fallback_patient(paciente_actual)
                print(f"[PDF ARCHIVE] Guardado exitoso en pacientes_db.json para {p_id}")
                
                # Actualizar también Elasticsearch para consistencia híbrida
                es = get_elastic_client()
                es_online = False
                try:
                    es_online = es.ping()
                except Exception:
                    es_online = False
                    
                if es_online:
                    try:
                        es_doc = paciente_actual.copy()
                        if "_id" in es_doc:
                            del es_doc["_id"]
                        es.index(
                            index=PACIENTES_INDEX,
                            id=f"{c_id}_{p_id}",
                            document=es_doc,
                            refresh=True,
                        )
                        print(f"[PDF ARCHIVE] Guardado exitoso en Elasticsearch para {p_id}")
                    except Exception as es_err:
                        print(f"[PDF ARCHIVE] Error al indexar en Elasticsearch: {es_err}")
                        
            except Exception as archive_err:
                print(f"[PDF ARCHIVE ERROR] Error crítico al archivar documento: {archive_err}")


            from database_fallback import PACIENTES_JSON_PATH
            return {
                "status": "success",
                "data": {
                    "tipo_documento": payload.tipo_documento,
                    "url_descarga": url,
                    "db_file_path": PACIENTES_JSON_PATH
                },
                "message": f"El documento clínico de tipo '{payload.tipo_documento}' ha sido generado exitosamente. URL: {url}"
            }
        return {"status": "error", "message": f"No se pudo generar el documento PDF. Detalle: {res}"}
    except Exception as e:
        return {"status": "error", "message": f"No se pudo generar el documento PDF debido a un error crítico. Detalle: {str(e)}"}


# ---------------------------------------------------------------------------
# Herramienta: Notificaciones
# ---------------------------------------------------------------------------

class NotifierPayload(BaseModel):
    paciente_id: str = Field(
        ...,
        description="Número de teléfono móvil o identificador de destino del paciente (ej. '+529511234567')."
    )
    mensaje_texto: str = Field(
        ...,
        description="Texto redactado en lenguaje natural que se enviará al celular del paciente."
    )
    canal: Optional[str] = Field(
        "whatsapp",
        description="Canal de comunicación a utilizar para la entrega: 'whatsapp' (predeterminado) o 'sms'."
    )
    clinica_id: Optional[str] = Field(
        "OO-CLINIC-001",
        description="Identificador único de la clínica para garantizar el aislamiento Multi-Tenant."
    )


@app.post(
    "/tools/notifier",
    summary="Enviar notificación al paciente",
    description="Envía una notificación o mensaje en tiempo real a un paciente (simulado o real con Twilio) mediante WhatsApp o SMS. "
                "El agente LLM debe usar esta herramienta cuando el doctor solicite expresamente enviar una alerta, un presupuesto o una receta directo al celular del paciente.",
    operation_id="enviar_notificacion_paciente"
)
async def run_notifier_tool(payload: NotifierPayload):
    try:
        res = enviar_notificacion_paciente(
            payload.paciente_id,
            payload.mensaje_texto,
            payload.canal,
            payload.clinica_id
        )
        if "Success" in res:
            return {
                "status": "success",
                "data": {
                    "paciente_id": payload.paciente_id,
                    "canal": payload.canal,
                    "mensaje_enviado": payload.mensaje_texto
                },
                "message": f"La notificación ha sido enviada con éxito al paciente mediante el canal {payload.canal}. Detalle: {res}"
            }
        return {"status": "error", "message": f"No se pudo enviar la notificación al paciente. Detalle: {res}"}
    except Exception as e:
        return {"status": "error", "message": f"Error inesperado al enviar la notificación: {str(e)}"}
