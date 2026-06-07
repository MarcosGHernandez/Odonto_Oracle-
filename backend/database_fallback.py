"""
database_fallback.py — Base de datos local en JSON para Odonto-Oracle.
Actúa como respaldo (fallback) resiliente si Elasticsearch está inactivo o vacío.
Permite que el dashboard y el agente de chat muestren datos reales de inmediato.
"""

import os
import json
import uuid
from typing import List, Dict, Any, Optional

# Ruta de persistencia local en el directorio static público
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
PACIENTES_JSON_PATH = os.path.abspath(os.path.join(STATIC_DIR, "pacientes_db.json"))
CONSULTAS_JSON_PATH = os.path.abspath(os.path.join(STATIC_DIR, "consultas_db.json"))
PRECIOS_JSON_PATH = os.path.abspath(os.path.join(STATIC_DIR, "precios_db.json"))


# ---------------------------------------------------------------------------
# Semilla inicial de datos clínicos reales para el Hackathon
# ---------------------------------------------------------------------------
DEFAULT_PATIENTS = [
    {
        "clinica_id": "OO-CLINIC-001",
        "paciente_id": "P-CSLIM001",
        "nombre": "Carlos Slim",
        "telefono": "+529511234567",
        "email": "carlos.slim@dominiomedico.com",
        "fecha_nacimiento": "1940-01-28",
        "historial_medico": "Paciente adulto mayor con excelente higiene general. Presenta antecedentes de implante dental en molar superior izquierdo. Requiere revision periodontica de rutina.",
        "alergias": "Penicilina, AINEs",
        "medicamentos_actuales": "Aspirina 100mg",
        "enfermedades_cronicas": "Hipertension leve controlada",
        "vitales": {
            "presion_arterial": "120/80",
            "frecuencia_cardiaca": "68",
            "peso_kg": "82",
            "estatura_cm": "178"
        }
    },
    {
        "clinica_id": "OO-CLINIC-001",
        "paciente_id": "P-ARMANDO01",
        "nombre": "Armando Ramos",
        "telefono": "+529519876543",
        "email": "armando.ramos@dentalmail.com",
        "fecha_nacimiento": "1988-06-15",
        "historial_medico": "Paciente con gingivitis leve en cuadrante inferior. Requiere profilaxis profunda, detartraje dental y resinas esteticas en premolares izquierdos.",
        "alergias": "Ninguna declarada",
        "medicamentos_actuales": "Ninguno",
        "enfermedades_cronicas": "Ninguna",
        "vitales": {
            "presion_arterial": "118/75",
            "frecuencia_cardiaca": "72",
            "peso_kg": "75",
            "estatura_cm": "172"
        }
    },
    {
        "clinica_id": "OO-CLINIC-001",
        "paciente_id": "P-MARIA002",
        "nombre": "Maria Lopez",
        "telefono": "+529515551234",
        "email": "maria.lopez@ejemplo.com",
        "fecha_nacimiento": "1975-03-22",
        "historial_medico": "Paciente con antecedentes de diabetes tipo 2. Presenta caries activa en segundo molar inferior derecho. Requiere endodoncia y posterior corona libre de metal.",
        "alergias": "Latex, Sulfas",
        "medicamentos_actuales": "Metformina 500mg, Glibenclamida 5mg",
        "enfermedades_cronicas": "Diabetes Tipo 2",
        "vitales": {
            "presion_arterial": "130/85",
            "frecuencia_cardiaca": "78",
            "peso_kg": "68",
            "estatura_cm": "160"
        }
    },
    {
        "clinica_id": "OO-CLINIC-001",
        "paciente_id": "P-PEDRO003",
        "nombre": "Pedro Garcia",
        "telefono": "+529511112222",
        "email": "pedro.garcia@outlook.com",
        "fecha_nacimiento": "1995-11-10",
        "historial_medico": "Deportista de alto rendimiento. Dentadura sana, requiere guarda oclusal para bruxismo nocturno moderado. Sin tratamientos invasivos pendientes.",
        "alergias": "Ninguna",
        "medicamentos_actuales": "Ninguno",
        "enfermedades_cronicas": "Ninguna",
        "vitales": {
            "presion_arterial": "110/70",
            "frecuencia_cardiaca": "58",
            "peso_kg": "78",
            "estatura_cm": "180"
        }
    }
]

DEFAULT_CONSULTATIONS = [
    {
        "clinica_id": "OO-CLINIC-001",
        "paciente_id": "P-CSLIM001",
        "fecha_consulta": "2026-05-18",
        "diagnostico": "Gingivitis cronica asociada a placa bacteriana.",
        "tratamiento": "Profilaxis y aplicacion de barniz de fluor. Instruccion de tecnica de cepillado.",
        "notas_adicionales": "Paciente cooperador. Se recomienda proxima cita en 6 meses."
    },
    {
        "clinica_id": "OO-CLINIC-001",
        "paciente_id": "P-ARMANDO01",
        "fecha_consulta": "2026-05-19",
        "diagnostico": "Caries de dentina profunda en organo dentario 36.",
        "tratamiento": "Remocion de caries, proteccion dentino-pulpar y obturacion con resina de fotocurado Z350 de 3M.",
        "notas_adicionales": "Ligera sensibilidad post-operatoria esperada. Monitorear."
    }
]


def init_json_db():
    """Garantiza la existencia de la carpeta static y crea los archivos JSON sembrados."""
    os.makedirs(STATIC_DIR, exist_ok=True)
    
    if not os.path.exists(PACIENTES_JSON_PATH):
        with open(PACIENTES_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_PATIENTS, f, ensure_ascii=False, indent=2)
        print(f"[JSON DB] Sembrados {len(DEFAULT_PATIENTS)} pacientes iniciales en {PACIENTES_JSON_PATH}.")
        
    if not os.path.exists(CONSULTAS_JSON_PATH):
        with open(CONSULTAS_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CONSULTATIONS, f, ensure_ascii=False, indent=2)
        print(f"[JSON DB] Sembradas {len(DEFAULT_CONSULTATIONS)} consultas en {CONSULTAS_JSON_PATH}.")

    if not os.path.exists(PRECIOS_JSON_PATH):
        with open(PRECIOS_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        print(f"[JSON DB] Inicializado historial de precios en {PRECIOS_JSON_PATH}.")


# Auto-inicializar al importar el módulo
init_json_db()


# ---------------------------------------------------------------------------
# Operaciones del Fallback JSON
# ---------------------------------------------------------------------------

def load_patients() -> List[Dict[str, Any]]:
    """Carga todos los pacientes del archivo JSON local."""
    try:
        if os.path.exists(PACIENTES_JSON_PATH):
            with open(PACIENTES_JSON_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"[JSON DB] Error al cargar pacientes JSON: {e}")
    return []


def save_patients(pacientes: List[Dict[str, Any]]):
    """Guarda la lista completa de pacientes en el archivo JSON local."""
    try:
        with open(PACIENTES_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(pacientes, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
    except Exception as e:
        print(f"[JSON DB] Error al guardar pacientes JSON: {e}")


def load_consultations() -> List[Dict[str, Any]]:
    """Carga todas las consultas/citas del archivo JSON local, garantizando IDs estables."""
    try:
        if os.path.exists(CONSULTAS_JSON_PATH):
            with open(CONSULTAS_JSON_PATH, "r", encoding="utf-8") as f:
                consultas = json.load(f)
            
            modified = False
            for idx, c in enumerate(consultas):
                cid = c.get("id") or c.get("_id")
                if not cid:
                    cid = f"C-{uuid.uuid4().hex[:8]}"
                    c["id"] = cid
                    c["_id"] = cid
                    modified = True
                else:
                    if "id" not in c:
                        c["id"] = cid
                        modified = True
                    if "_id" not in c:
                        c["_id"] = cid
                        modified = True
            
            if modified:
                save_consultations(consultas)
            return consultas
    except Exception as e:
        print(f"[JSON DB] Error al cargar consultas JSON: {e}")
    return []


def save_consultations(consultas: List[Dict[str, Any]]):
    """Guarda la lista completa de consultas en el archivo JSON local."""
    try:
        with open(CONSULTAS_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(consultas, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
    except Exception as e:
        print(f"[JSON DB] Error al guardar consultas JSON: {e}")


def get_fallback_patients(clinica_id: str) -> List[Dict[str, Any]]:
    """Devuelve los pacientes filtrados por clinica_id (Multi-Tenancy)."""
    pacientes = load_patients()
    return [p for p in pacientes if p.get("clinica_id") == clinica_id]


def save_fallback_patient(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Guarda o actualiza un paciente en la base local (Upsert).
    Retorna el documento del paciente creado o actualizado.
    """
    pacientes = load_patients()
    clinica_id = doc.get("clinica_id", "OO-CLINIC-001")
    pid = doc.get("paciente_id")
    
    if not pid:
        pid = f"P-{uuid.uuid4().hex[:8]}"
        doc["paciente_id"] = pid
        
    doc["clinica_id"] = clinica_id
    
    # Buscar si ya existe para hacer update
    index_to_update = -1
    for idx, p in enumerate(pacientes):
        if p.get("clinica_id") == clinica_id and p.get("paciente_id") == pid:
            index_to_update = idx
            break
            
    if index_to_update >= 0:
        # Preservar campos existentes si el valor entrante es None
        old_doc = pacientes[index_to_update]
        clean_doc = {k: v for k, v in doc.items() if v is not None}
        updated_doc = {**old_doc, **clean_doc}
        pacientes[index_to_update] = updated_doc
        result_doc = updated_doc
    else:
        pacientes.append(doc)
        result_doc = doc
        
    save_patients(pacientes)
    return result_doc


def search_fallback_patient(nombre: str, clinica_id: str) -> Optional[Dict[str, Any]]:
    """Busca un paciente por nombre (parcial y estricto) dentro de la clínica."""
    pacientes = load_patients()
    nombre_lower = nombre.lower().strip()
    
    # Intento 1: Coincidencia de ID clínico exacto
    for p in pacientes:
        if p.get("clinica_id") == clinica_id and p.get("paciente_id", "").lower() == nombre_lower:
            return p
            
    # Intento 2: Coincidencia del nombre parcial
    for p in pacientes:
        if p.get("clinica_id") == clinica_id and nombre_lower in p.get("nombre", "").lower():
            return p
            
    return None


def get_fallback_consultations(clinica_id: str, paciente_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Devuelve las consultas filtradas por clínica y opcionalmente por paciente."""
    consultas = load_consultations()
    res = [c for c in consultas if c.get("clinica_id") == clinica_id]
    if paciente_id:
        res = [c for c in res if c.get("paciente_id") == paciente_id]
    return res


def save_fallback_consultation(doc: Dict[str, Any]) -> str:
    """Guarda o actualiza una consulta o cita en la base local (Upsert)."""
    consultas = load_consultations()
    clinica_id = doc.get("clinica_id", "OO-CLINIC-001")
    doc["clinica_id"] = clinica_id
    
    # Generar o usar un ID estable
    cid = doc.get("id") or doc.get("_id")
    if not cid:
        cid = f"C-{uuid.uuid4().hex[:8]}"
    
    doc["id"] = cid
    doc["_id"] = cid
    
    index_to_update = -1
    for idx, c in enumerate(consultas):
        if c.get("clinica_id") == clinica_id and (c.get("id") == cid or c.get("_id") == cid):
            index_to_update = idx
            break
            
    if index_to_update >= 0:
        old_doc = consultas[index_to_update]
        updated_doc = {**old_doc, **doc}
        consultas[index_to_update] = updated_doc
    else:
        consultas.append(doc)
        
    save_consultations(consultas)
    return cid


def delete_fallback_consultation(appointment_id: str, clinica_id: str) -> bool:
    """Elimina una consulta/cita de la base local JSON por ID y clinica_id."""
    consultas = load_consultations()
    initial_len = len(consultas)
    consultas = [
        c for c in consultas 
        if not (c.get("clinica_id") == clinica_id and (c.get("id") == appointment_id or c.get("_id") == appointment_id))
    ]
    if len(consultas) < initial_len:
        save_consultations(consultas)
        return True
    return False


def delete_fallback_patient(paciente_id: str, clinica_id: str) -> bool:
    """Elimina un paciente y todas sus consultas asociadas de la base local JSON."""
    pacientes = load_patients()
    initial_patients_len = len(pacientes)
    pacientes = [
        p for p in pacientes
        if not (p.get("clinica_id") == clinica_id and p.get("paciente_id") == paciente_id)
    ]
    
    consultas = load_consultations()
    consultas = [
        c for c in consultas
        if not (c.get("clinica_id") == clinica_id and c.get("paciente_id") == paciente_id)
    ]
    
    if len(pacientes) < initial_patients_len:
        save_patients(pacientes)
        save_consultations(consultas)
        return True
    return False


def update_fallback_consultation(appointment_id: str, clinica_id: str, update_fields: Dict[str, Any]) -> bool:
    """Actualiza campos específicos de una consulta/cita en la base local JSON."""
    consultas = load_consultations()
    found = False
    for idx, c in enumerate(consultas):
        if c.get("clinica_id") == clinica_id and (c.get("id") == appointment_id or c.get("_id") == appointment_id):
            consultas[idx] = {**c, **update_fields, "id": appointment_id, "_id": appointment_id}
            found = True
            break
    if found:
        save_consultations(consultas)
        return True
    return False


# ---------------------------------------------------------------------------
# Precios de Materiales Dentales — Persistencia Offline (Fallback JSON)
# ---------------------------------------------------------------------------

def load_prices() -> List[Dict[str, Any]]:
    """Carga el historial de precios del archivo JSON local."""
    try:
        if os.path.exists(PRECIOS_JSON_PATH):
            with open(PRECIOS_JSON_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"[JSON DB] Error al cargar historial de precios: {e}")
    return []


def save_prices(precios: List[Dict[str, Any]]):
    """Guarda la lista completa de precios en el archivo JSON local."""
    try:
        with open(PRECIOS_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(precios, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
    except Exception as e:
        print(f"[JSON DB] Error al guardar historial de precios: {e}")


def save_fallback_price(doc: Dict[str, Any]) -> None:
    """
    Persiste un registro de precio en la base local JSON.
    Mantiene un maximo de 500 registros para evitar crecimiento ilimitado.
    """
    try:
        precios = load_prices()
        precios.append(doc)
        # Limitar a los ultimos 500 registros para no inflar el archivo
        if len(precios) > 500:
            precios = precios[-500:]
        save_prices(precios)
        print(f"[JSON DB] Precio guardado localmente: {doc.get('material', 'N/A')} / {doc.get('region', 'N/A')}")
    except Exception as e:
        print(f"[JSON DB] Error al guardar precio en fallback local: {e}")


def get_fallback_prices(
    material: str,
    region: str,
    clinica_id: str = "OO-CLINIC-001",
    limite: int = 10,
) -> List[Dict[str, Any]]:
    """
    Recupera el historial de precios de un material y region especificos.
    Busqueda insensible a mayusculas para mayor flexibilidad.
    """
    try:
        precios = load_prices()
        material_lower = material.lower().strip()
        region_upper = region.upper().strip()
        resultado = [
            p for p in precios
            if material_lower in p.get("material", "").lower()
            and p.get("region", "").upper() == region_upper
        ]
        # Devolver los mas recientes primero
        return list(reversed(resultado))[:limite]
    except Exception as e:
        print(f"[JSON DB] Error al recuperar historial de precios: {e}")
        return []
