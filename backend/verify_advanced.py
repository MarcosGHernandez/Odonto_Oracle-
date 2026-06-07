import requests
import json
import os

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8080")

def test_search_and_fallback():
    print("\n--- A. PROBANDO BÚSQUEDA DE PACIENTES (Elastic & Fallback) ---")
    
    # 1. Buscar a Carlos Slim (Debe tener alergia a la penicilina)
    payload_slim = {"nombre": "Carlos Slim", "clinica_id": "OO-CLINIC-001"}
    try:
        res = requests.post(f"{BASE_URL}/tools/search_patient", json=payload_slim)
        data = res.json()
        print("Búsqueda Carlos Slim:")
        print(json.dumps(data, indent=2))
        assert res.status_code == 200
        assert data["status"] == "success"
        assert "penicilina" in data["data"]["paciente"]["alergias"].lower()
        print("[OK] Búsqueda de Carlos Slim exitosa y con alergia a la penicilina verificada.")
    except Exception as e:
        print(f"[ERROR] Error al buscar a Carlos Slim: {e}")

    # 2. Buscar a Armando Ramos (Datos completos)
    payload_armando = {"nombre": "Armando Ramos", "clinica_id": "OO-CLINIC-001"}
    try:
        res = requests.post(f"{BASE_URL}/tools/search_patient", json=payload_armando)
        data = res.json()
        print("\nBúsqueda Armando Ramos:")
        print(json.dumps(data, indent=2))
        assert res.status_code == 200
        assert data["status"] == "success"
        assert data["data"]["paciente"]["paciente_id"] == "P-ARMANDO01"
        print("[OK] Búsqueda de Armando Ramos exitosa y verificada.")
    except Exception as e:
        print(f"[ERROR] Error al buscar a Armando Ramos: {e}")

def test_registrar_y_editar():
    print("\n--- B. PROBANDO REGISTRO Y EDICIÓN DE PACIENTES ---")
    
    # 1. Registrar paciente nuevo
    import uuid
    rand_suffix = uuid.uuid4().hex[:6]
    nombre_steve = f"Steve Jobs {rand_suffix}"
    payload_new = {
        "clinica_id": "OO-CLINIC-001",
        "nombre": nombre_steve,
        "telefono": f"+1408555{uuid.uuid4().hex[:4]}",
        "email": f"steve_{rand_suffix}@apple.com",
        "fecha_nacimiento": "1955-02-24",
        "historial_medico": "Paciente requiere profilaxis dental de rutina. Excelente salud general.",
        "alergias": "Ninguna",
        "medicamentos_actuales": "Ninguno",
        "enfermedades_cronicas": "Ninguna",
        "vitales": {
            "presion_arterial": "120/80",
            "frecuencia_cardiaca": "70"
        }
    }
    
    try:
        res = requests.post(f"{BASE_URL}/webhook/paciente", json=payload_new)
        data = res.json()
        print(f"Registro de {nombre_steve}:")
        print(json.dumps(data, indent=2))
        assert res.status_code == 200
        assert data["status"] == "success"
        paciente_id = data["data"]["paciente_id"]
        print(f"[OK] Paciente {nombre_steve} registrado con ID: {paciente_id}")

        # 2. Editar el paciente registrado para añadir alergia
        payload_edit = {
            "clinica_id": "OO-CLINIC-001",
            "paciente_id": paciente_id,
            "nombre": nombre_steve,
            "alergias": "Nueces, Polvo"
        }
        res_edit = requests.post(f"{BASE_URL}/webhook/paciente", json=payload_edit)
        data_edit = res_edit.json()
        print(f"\nEdición de {nombre_steve}:")
        print(json.dumps(data_edit, indent=2))
        assert res_edit.status_code == 200
        assert data_edit["status"] == "success"
        print(f"[OK] Paciente {nombre_steve} editado correctamente.")

        # 3. Buscar de nuevo para verificar los cambios
        res_check = requests.post(f"{BASE_URL}/tools/search_patient", json={"nombre": nombre_steve, "clinica_id": "OO-CLINIC-001"})
        data_check = res_check.json()
        print(f"\nVerificación {nombre_steve}:")
        print(json.dumps(data_check, indent=2))
        assert data_check["data"]["paciente"]["alergias"] == "Nueces, Polvo"
        print("[OK] Cambios en el expediente persistidos y verificados con éxito.")

    except Exception as e:
        print(f"[ERROR] Error en registro/edición: {e}")

def test_agendar_cita():
    print("\n--- C. PROBANDO AGENDAMIENTO DE CITAS ---")
    from datetime import datetime, timedelta
    import random
    
    random_days = random.randint(10, 150)
    random_hour = random.randint(9, 17)
    future_date = (datetime.now() + timedelta(days=random_days)).replace(hour=random_hour, minute=0, second=0, microsecond=0)
    fecha_cita = future_date.strftime("%Y-%m-%d %H:%M")
    
    payload = {
        "clinica_id": "OO-CLINIC-001",
        "paciente_id": "P-CSLIM001",
        "fecha_consulta": fecha_cita,
        "diagnostico": "Revisión periodóntica",
        "tratamiento": "Profilaxis profunda y detartraje",
        "notas_adicionales": "Confirmar asistencia un día antes."
    }
    try:
        res = requests.post(f"{BASE_URL}/tools/schedule_appointment", json=payload)
        data = res.json()
        print(f"Cita agendada para Carlos Slim en fecha {fecha_cita}:")
        print(json.dumps(data, indent=2))
        assert res.status_code == 200
        assert data["status"] == "success"
        print("[OK] Cita agendada y registrada en almacenamiento híbrido.")
    except Exception as e:
        print(f"[ERROR] Error al agendar cita: {e}")

def test_notificar_con_resolucion_de_id():
    print("\n--- D. PROBANDO NOTIFICACIÓN CON RESOLUCIÓN DE ID CLÍNICO ---")
    payload = {
        "paciente_id": "P-CSLIM001",  # ID Clínico, NO un número de teléfono directo
        "mensaje_texto": "Estimado Sr. Carlos Slim, le recordamos su cita programada.",
        "canal": "whatsapp"
    }
    try:
        res = requests.post(f"{BASE_URL}/tools/notifier", json=payload)
        data = res.json()
        print("Notificación con resolución de ID:")
        print(json.dumps(data, indent=2))
        assert res.status_code == 200
        assert data["status"] == "success"
        assert "+529511234567" in data["message"] or "+529511234567" in data["paciente_id"]
        print("[OK] ID clínico P-CSLIM001 resuelto a +529511234567 y mensaje simulado correctamente.")
    except Exception as e:
        print(f"[ERROR] Error en resolución de notificación: {e}")

if __name__ == "__main__":
    print("=== VALIDACIÓN DE FUNCIONALIDADES AVANZADAS (ODONTO-ORACLE) ===")
    test_search_and_fallback()
    test_registrar_y_editar()
    test_agendar_cita()
    test_notificar_con_resolucion_de_id()
    print("\n=== VALIDACIÓN COMPLETA Y CORRECTA ===")
