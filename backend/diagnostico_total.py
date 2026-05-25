import os
import sys
import json
import uuid
import time
from database_fallback import save_fallback_consultation, load_consultations, CONSULTAS_JSON_PATH

def run_diagnostics():
    print(f"=== INICIANDO DIAGNÓSTICO TOTAL DE PERSISTENCIA ===")
    print(f"Path de Consultas JSON: {os.path.abspath(CONSULTAS_JSON_PATH)}")
    
    # 1. Crear Cita
    test_cita = {
        "clinica_id": "OO-CLINIC-001",
        "paciente_id": "P-TEST-DIAGNOSTICO",
        "fecha_consulta": "2026-10-10T10:00:00",
        "diagnostico": "Cita de prueba diagnostico autopsia",
        "tratamiento": "Revisión general",
        "_id": f"TEST_{uuid.uuid4().hex[:8]}"
    }
    
    print(f"\n1. Escribiendo cita en base local: {test_cita['_id']}")
    try:
        save_fallback_consultation(test_cita)
        print(" -> save_fallback_consultation() completado.")
    except Exception as e:
        print(f" -> ERROR escribiendo cita: {e}")
        return
        
    print("\n2. Verificando lectura desde disco crudo...")
    try:
        with open(CONSULTAS_JSON_PATH, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
            encontrado = any(c.get("_id") == test_cita["_id"] for c in raw_data)
            print(f" -> Cita encontrada en archivo JSON físico: {encontrado}")
    except Exception as e:
        print(f" -> ERROR leyendo JSON: {e}")

    print("\n3. Verificando a través de función load_consultations()...")
    mem_data = load_consultations()
    encontrado_mem = any(c.get("_id") == test_cita["_id"] for c in mem_data)
    print(f" -> Cita encontrada en memoria: {encontrado_mem}")
    
    print("\n=== DIAGNÓSTICO COMPLETADO ===")

if __name__ == "__main__":
    run_diagnostics()
