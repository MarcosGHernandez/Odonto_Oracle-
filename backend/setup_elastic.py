import os
from dotenv import load_dotenv
from elasticsearch import Elasticsearch, exceptions

# Cargar variables de entorno
load_dotenv()

def get_elastic_client() -> Elasticsearch:
    """Configura y retorna el cliente de Elasticsearch basado en las variables de entorno."""
    elastic_url = os.getenv("ELASTIC_URL", "http://localhost:9200")
    api_key = os.getenv("ELASTIC_API_KEY")
    
    if api_key:
        return Elasticsearch(elastic_url, api_key=api_key)
    else:
        # Modo desarrollo local sin seguridad
        return Elasticsearch(elastic_url)

def setup_indices():
    """
    Crea los índices necesarios en Elasticsearch con los mappings adecuados para
    búsqueda híbrida y multi-tenancy.
    Retorna un string descriptivo (éxito o error) para ser consumido por un LLM.
    """
    try:
        es = get_elastic_client()
        
        # Verificar conexión
        if not es.ping():
            return "System Error: No se pudo conectar a Elasticsearch. Verifica que el contenedor esté corriendo o las credenciales sean correctas."

        # 1. Mapping para pacientes (Multi-Tenant y Relacional/Híbrido)
        pacientes_index = "pacientes_produccion"
        pacientes_mapping = {
            "mappings": {
                "properties": {
                    "clinica_id": {"type": "keyword"}, # CRÍTICO: Para multi-tenancy
                    "paciente_id": {"type": "keyword"},
                    "nombre": {"type": "text"},
                    "fecha_nacimiento": {"type": "date", "format": "yyyy-MM-dd"},
                    "alergias": {"type": "text"},
                    "historial_medico": {"type": "text"},
                    "vector_embedding": {
                        "type": "dense_vector",
                        "dims": 768, # Ajustar según el modelo de embedding (ej. Vertex AI / HuggingFace)
                        "index": True,
                        "similarity": "cosine"
                    }
                }
            }
        }

        # 2. Mapping para literatura clínica (Búsqueda Densa RAG)
        literatura_index = "literatura_clinica_vectores"
        literatura_mapping = {
            "mappings": {
                "properties": {
                    "clinica_id": {"type": "keyword"}, # Para guías clínicas personalizadas por clínica
                    "titulo": {"type": "text"},
                    "contenido": {"type": "text"},
                    "categoria": {"type": "keyword"}, # ej. "protocolo", "medicamento"
                    "vector_embedding": {
                        "type": "dense_vector",
                        "dims": 768,
                        "index": True,
                        "similarity": "cosine"
                    }
                }
            }
        }

        indices_creados = []

        # Crear índice de pacientes
        if not es.indices.exists(index=pacientes_index):
            es.indices.create(index=pacientes_index, body=pacientes_mapping)
            indices_creados.append(pacientes_index)

        # Crear índice de literatura
        if not es.indices.exists(index=literatura_index):
            es.indices.create(index=literatura_index, body=literatura_mapping)
            indices_creados.append(literatura_index)

        if indices_creados:
            return f"Success: Se crearon los índices {', '.join(indices_creados)} correctamente."
        else:
            return "Success: Los índices ya existían. No se requirió ninguna acción."

    except exceptions.ConnectionError:
        return "System Error: Fallo la conexión de red hacia Elasticsearch. El servicio podría estar caído."
    except Exception as e:
        return f"System Error: Ocurrió un error inesperado al configurar Elastic: {str(e)}"

if __name__ == "__main__":
    # Ejecutar setup al llamar el script directamente
    resultado = setup_indices()
    print(resultado)
