"""
tools/search.py — Herramienta de búsqueda de pacientes en Elasticsearch.

La función principal ejecuta una búsqueda 'match' con filtro Multi-Tenant
obligatorio (clinica_id). Retorna texto plano en caso de error para que
el Agente LLM pueda interpretar el resultado y auto-corregirse.
"""

from database import get_elastic_client, PACIENTES_INDEX, ping_elasticsearch
from elasticsearch import exceptions
import concurrent.futures

# Timeout agresivo para el ping de Elastic — previene bloqueos TCP en Windows
_ES_PING_TIMEOUT = 1.5  # segundos


def _ping_with_timeout(es) -> bool:
    """Ejecuta es.ping() con timeout de red para prevenir bloqueos TCP en Windows."""
    return ping_elasticsearch(_ES_PING_TIMEOUT)


def buscar_paciente(nombre: str, clinica_id: str = "clinica_default") -> dict | str:
    """
    Realiza una búsqueda 'match' en el campo 'nombre' del índice de pacientes,
    restringida al clinica_id del tenant activo. Si Elasticsearch falla o no
    encuentra al paciente, realiza una búsqueda de respaldo en la base local JSON.

    Args:
        nombre:     Nombre completo o parcial del paciente.
        clinica_id: ID del tenant (clínica). Obligatorio para Multi-Tenancy.

    Returns:
        dict con los datos del primer paciente encontrado, o un string de error.
    """
    from database_fallback import search_fallback_patient

    try:
        if not nombre or not nombre.strip():
            return (
                "System Error: El parámetro 'nombre' es obligatorio para la búsqueda. "
                "Por favor indica el nombre o apellido del paciente."
            )

        es = get_elastic_client()
        es_online = False

        try:
            es_online = _ping_with_timeout(es)
        except Exception:
            es_online = False

        if es_online:
            query = {
                "query": {
                    "bool": {
                        # Filtro de seguridad Multi-Tenant: SIEMPRE presente
                        "filter": [
                            {"term": {"clinica_id": clinica_id}}
                        ],
                        "must": [
                            {
                                "match": {
                                    "nombre": {
                                        "query": nombre,
                                        "fuzziness": "AUTO",   # Tolera errores de escritura
                                        "operator": "or",
                                    }
                                }
                            }
                        ],
                    }
                },
                "size": 5,
            }

            response = es.search(index=PACIENTES_INDEX, body=query)
            hits = response["hits"]["hits"]

            if hits:
                # Retornar el primer resultado con sus datos clínicos
                paciente = hits[0]["_source"]
                paciente["_id"] = hits[0]["_id"]
                paciente["_score"] = hits[0]["_score"]
                return {"status": "success", "total": len(hits), "paciente": paciente, "fuente": "Elasticsearch"}

        # Fallback a la base local JSON si no hay conexión o no hubo resultados en Elastic
        p = search_fallback_patient(nombre, clinica_id)
        if p:
            # Asegurar campo _id
            if "_id" not in p:
                p["_id"] = f"{p['clinica_id']}_{p['paciente_id']}"
            return {"status": "success", "total": 1, "paciente": p, "fuente": "JSON Fallback Local"}

        return (
            f"Sistema: No se encontraron pacientes con el nombre '{nombre}' "
            f"en los registros de la clínica {clinica_id} (Elasticsearch / JSON Fallback)."
        )

    except Exception as e:
        # Fallback de emergencia por cualquier otro error
        try:
            p = search_fallback_patient(nombre, clinica_id)
            if p:
                if "_id" not in p:
                    p["_id"] = f"{p['clinica_id']}_{p['paciente_id']}"
                return {"status": "success", "total": 1, "paciente": p, "fuente": "JSON Fallback Local (Error Fallback)"}
        except Exception:
            pass
        return f"System Error: Error inesperado al buscar paciente: {str(e)}"

