import os
import json
import uuid
from database_fallback import save_fallback_consultation, CONSULTAS_JSON_PATH

def main():
    print("--- INICIANDO TEST DE ESCRITURA ---")
    
    # 1. Definir cita de prueba
    test_appointment = {
        "clinica_id": "OO-CLINIC-001",
        "paciente_id": "P-TEST-WRITE",
        "fecha_consulta": "2026-05-25 10:00",
        "diagnostico": "Cita de prueba de auditoria de persistencia.",
        "tratamiento": "Revisión técnica de tubería de datos.",
        "notas_adicionales": f"Generada por test_db_write.py con ID: {uuid.uuid4().hex[:6]}"
    }
    
    # 2. Obtener el path absoluto original
    abs_path_before = os.path.abspath(CONSULTAS_JSON_PATH)
    print(f"Ruta absoluta destino configurada: {abs_path_before}")
    
    # 3. Guardar usando la función de fallback
    print("Intentando guardar cita...")
    result = save_fallback_consultation(test_appointment)
    print(f"Resultado de la función: {result}")
    
    # 4. Verificar existencia física del archivo y leer contenido
    if os.path.exists(CONSULTAS_JSON_PATH):
        abs_path_after = os.path.abspath(CONSULTAS_JSON_PATH)
        print(f"[OK] El archivo existe en disco en: {abs_path_after}")
        
        try:
            with open(CONSULTAS_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # Buscar nuestra cita de prueba
            found = False
            for item in data:
                if item.get("paciente_id") == "P-TEST-WRITE" and item.get("notas_adicionales") == test_appointment["notas_adicionales"]:
                    found = True
                    print("[ÉXITO] La cita de prueba fue encontrada físicamente en el archivo JSON.")
                    print(json.dumps(item, indent=2, ensure_ascii=False))
                    break
            
            if not found:
                print("[ERROR] El archivo se actualizó, pero no se encontró la cita de prueba en su interior.")
        except Exception as e:
            print(f"[ERROR] Error al leer el archivo JSON: {e}")
    else:
        print("[FALLO] El archivo JSON no se encuentra físicamente en el disco.")

if __name__ == "__main__":
    main()
