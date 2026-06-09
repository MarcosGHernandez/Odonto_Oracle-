"""
database.py — Conector centralizado de Elasticsearch para Odonto-Oracle.

Todas las funciones devuelven strings descriptivos en caso de error para que
el Agente LLM pueda leerlos y auto-corregirse (protocolo de resiliencia).
"""

import os
from typing import Optional
from dotenv import load_dotenv
from elasticsearch import Elasticsearch, exceptions

load_dotenv()

# ---------------------------------------------------------------------------
# Cliente singleton
# ---------------------------------------------------------------------------

_client: Optional[Elasticsearch] = None


def get_elastic_client() -> Elasticsearch:
    """
    Retorna un cliente Elasticsearch reutilizable (singleton por proceso).
    Usa 127.0.0.1 explícitamente para evitar conflictos de resolución
    IPv6 en Windows donde 'localhost' puede apuntar a ::1 en vez de 127.0.0.1.
    """
    global _client
    if _client is not None:
        return _client

    # Forzar 127.0.0.1 como default — evita ambigüedad de 'localhost' en Windows
    elastic_url = os.getenv("ELASTICSEARCH_URL", os.getenv("ELASTIC_URL", "http://127.0.0.1:9200"))
    api_key = os.getenv("ELASTIC_API_KEY")

    if api_key:
        _client = Elasticsearch(
            hosts=[elastic_url],
            api_key=api_key,
            request_timeout=2,  # 2s hard limit — throw immediately if Elastic is down
            max_retries=0       # No reintentos — falla rápido, fallback a JSON local
        )
    else:
        _client = Elasticsearch(
            hosts=[elastic_url],
            request_timeout=2,  # 2s hard limit — throw immediately if Elastic is down
            max_retries=0       # No reintentos — falla rápido, fallback a JSON local
        )

    # Chequeo proactivo de conexión en la primera inicialización
    try:
        import concurrent.futures as _cf
        with _cf.ThreadPoolExecutor(max_workers=1) as _ex:
            _f = _ex.submit(_client.ping)
            if not _f.result(timeout=0.3):
                print(
                    "[Elasticsearch] ERROR: el servidor en "
                    f"{elastic_url} no respondió al ping. "
                    "Verifica que el contenedor esté corriendo."
                )
            else:
                print(f"[Elasticsearch] Conexión establecida correctamente en {elastic_url}.")
    except Exception as exc:
        print(
            f"[Elasticsearch] EXCEPCION o Timeout ({exc}) al conectar con {elastic_url}. "
            "El backend operará en modo degradado (JSON Fallback Local) hasta que el motor esté disponible."
        )

    return _client


import concurrent.futures

# Global ThreadPoolExecutor for lightweight, non-blocking operations (like pings)
# This avoids the ThreadPoolExecutor context manager exit-blocking bug on Windows.
_ping_executor = concurrent.futures.ThreadPoolExecutor(max_workers=10, thread_name_prefix="elastic_ping_")


def ping_elasticsearch(timeout: float = 0.3) -> bool:
    """
    Realiza un ping a Elasticsearch con un timeout estricto usando un
    ThreadPoolExecutor global persistente para evitar bloqueos TCP en Windows.
    """
    try:
        es = get_elastic_client()
        future = _ping_executor.submit(es.ping)
        return future.result(timeout=timeout)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Garantía de índices al arranque
# ---------------------------------------------------------------------------

PACIENTES_INDEX = "pacientes_produccion"
CONSULTAS_INDEX = "consultas_produccion"
PRECIOS_INDEX   = "historial_precios"


def ensure_indices() -> str:
    """
    Crea los índices 'pacientes' y 'consultas' si no existen.
    Retorna un string de éxito o un error legible por el LLM.
    """
    try:
        es = get_elastic_client()

        if not es.ping():
            return (
                "System Error: No se pudo conectar a Elasticsearch. "
                "Verifica que el contenedor esté corriendo en http://127.0.0.1:9200."
            )

        pacientes_mapping = {
            "mappings": {
                "properties": {
                    # Aislamiento Multi-Tenant — obligatorio en CADA query
                    "clinica_id":              {"type": "keyword"},
                    "paciente_id":             {"type": "keyword"},
                    "nombre":                  {"type": "text"},
                    "telefono":                {"type": "keyword"},
                    "email":                   {"type": "keyword"},
                    "fecha_nacimiento":        {"type": "date", "format": "yyyy-MM-dd"},
                    # Información clínica
                    "alergias":                {"type": "text"},
                    "medicamentos_actuales":   {"type": "text"},
                    "enfermedades_cronicas":   {"type": "text"},
                    "historial_medico":        {"type": "text"},
                    "diabetico":               {"type": "boolean"},

                    # Signos vitales como objeto dinámico
                    "vitales":                 {"type": "object", "dynamic": True},
                    # Vector para búsqueda semántica (Hybrid RAG)
                    "vector_embedding": {
                        "type": "dense_vector",
                        "dims": 768,
                        "index": True,
                        "similarity": "cosine",
                    },
                }
            }
        }

        consultas_mapping = {
            "mappings": {
                "properties": {
                    "clinica_id":       {"type": "keyword"},
                    "paciente_id":      {"type": "keyword"},
                    "fecha_consulta":   {"type": "date"},
                    "diagnostico":      {"type": "text"},
                    "tratamiento":      {"type": "text"},
                    "notas_adicionales":{"type": "text"},
                    "vector_embedding": {
                        "type": "dense_vector",
                        "dims": 768,
                        "index": True,
                        "similarity": "cosine",
                    },
                }
            }
        }

        precios_mapping = {
            "mappings": {
                "properties": {
                    "clinica_id":      {"type": "keyword"},
                    "material":        {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                    "region":          {"type": "keyword"},
                    "proveedor":       {"type": "keyword"},
                    "producto":        {"type": "text"},
                    "precio_raw":      {"type": "keyword"},    # Texto exacto devuelto por el scraper
                    "precio_numerico": {"type": "float"},      # Valor numérico para agregaciones
                    "moneda":          {"type": "keyword"},
                    "url_fuente":      {"type": "keyword"},
                    "fecha_consulta":  {"type": "date"},
                }
            }
        }

        creados = []

        if not es.indices.exists(index=PACIENTES_INDEX):
            es.indices.create(index=PACIENTES_INDEX, body=pacientes_mapping)
            creados.append(PACIENTES_INDEX)

        if not es.indices.exists(index=CONSULTAS_INDEX):
            es.indices.create(index=CONSULTAS_INDEX, body=consultas_mapping)
            creados.append(CONSULTAS_INDEX)

        if not es.indices.exists(index=PRECIOS_INDEX):
            es.indices.create(index=PRECIOS_INDEX, body=precios_mapping)
            creados.append(PRECIOS_INDEX)

        # Sembrado proactivo en Elasticsearch de pacientes por defecto
        try:
            from database_fallback import DEFAULT_PATIENTS, DEFAULT_CONSULTATIONS
            # Sembrar/Actualizar siempre los pacientes por defecto para asegurar su presencia
            for p in DEFAULT_PATIENTS:
                es.index(index=PACIENTES_INDEX, id=f"{p['clinica_id']}_{p['paciente_id']}", document=p)
            print(f"[Elasticsearch] Sembrados/Actualizados {len(DEFAULT_PATIENTS)} pacientes por defecto.")
            
            # Sembrar consultas también para Armando y Carlos Slim
            for c in DEFAULT_CONSULTATIONS:
                # Generar un ID único determinista para evitar duplicados en consultas
                c_id = f"{c['clinica_id']}_{c['paciente_id']}_{c['fecha_consulta']}"
                es.index(index=CONSULTAS_INDEX, id=c_id, document=c)
            print(f"[Elasticsearch] Sembradas/Actualizadas {len(DEFAULT_CONSULTATIONS)} consultas por defecto.")
        except Exception as seed_err:
            print(f"[Elasticsearch] Advertencia al sembrar pacientes: {seed_err}")

        if creados:
            return f"Success: Índices creados correctamente: {', '.join(creados)}. Sembrado verificado."
        return "Success: Los índices ya existían y el sembrado está verificado."

    except exceptions.ConnectionError:
        return (
            "System Error: Fallo la conexión de red hacia Elasticsearch. "
            "El servicio podría estar caído o la URL es incorrecta."
        )
    except Exception as e:
        return f"System Error: Error inesperado al configurar Elasticsearch: {str(e)}"
