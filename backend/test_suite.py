import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    print("\n--- 1. PROBANDO ENDPOINT DE SALUD (/health) ---")
    try:
        res = requests.get(f"{BASE_URL}/health")
        print(f"Status Code: {res.status_code}")
        print(f"Response: {json.dumps(res.json(), indent=2)}")
        assert res.status_code == 200
        print("[OK] /health funcionando correctamente.")
    except Exception as e:
        print(f"[ERROR] Error en /health: {e}")

def test_scraper():
    print("\n--- 2. PROBANDO HERRAMIENTA SCRAPER (/tools/scraper) ---")
    payload = {
        "material_dental": "Resina Z350 de 3M",
        "region": "MX"
    }
    try:
        res = requests.post(f"{BASE_URL}/tools/scraper", json=payload)
        print(f"Status Code: {res.status_code}")
        data = res.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        assert res.status_code == 200
        assert data["status"] == "success"
        print("[OK] Scraper de materiales dentales funcionando.")
    except Exception as e:
        print(f"[ERROR] Error en /tools/scraper: {e}")

def test_pdf_generator():
    print("\n--- 3. PROBANDO HERRAMIENTA GENERADOR PDF (/tools/pdf_generator) ---")
    payload = {
        "tipo_documento": "presupuesto",
        "datos_paciente": {
            "nombre": "Carlos Garcia",
            "paciente_id": "P-12345",
            "clinica_id": "OO-CLINIC-001",
            "alergias": "Penicilina"
        },
        "contenido_medico": "1. Resina de fotocurado Z350 - $850.00 MXN\n2. Limpieza ultrasónica - $450.00 MXN\nTotal: $1,300.00 MXN",
        "idioma": "es"
    }
    try:
        res = requests.post(f"{BASE_URL}/tools/pdf_generator", json=payload)
        print(f"Status Code: {res.status_code}")
        data = res.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        assert res.status_code == 200
        assert data["status"] == "success"
        assert "url_descarga" in data["data"] and data["data"]["url_descarga"] is not None
        print("[OK] Generador de PDF clinico funcionando con fpdf2.")
    except Exception as e:
        print(f"[ERROR] Error en /tools/pdf_generator: {e}")

def test_notifier():
    print("\n--- 4. PROBANDO HERRAMIENTA DE NOTIFICACIONES (/tools/notifier) ---")
    payload = {
        "paciente_id": "+529511234567",
        "mensaje_texto": "Hola Carlos, te adjuntamos tu presupuesto dental: http://127.0.0.1:8000/static/pdfs/test.pdf",
        "canal": "whatsapp"
    }
    try:
        res = requests.post(f"{BASE_URL}/tools/notifier", json=payload)
        print(f"Status Code: {res.status_code}")
        data = res.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        assert res.status_code == 200
        assert data["status"] == "success"
        print("[OK] Notificaciones SMS/WhatsApp funcionando.")
    except Exception as e:
        print(f"[ERROR] Error en /tools/notifier: {e}")

if __name__ == "__main__":
    print("=== INICIANDO SET DE PRUEBAS DE INTEGRACIÓN CLÍNICA (ODONTO-ORACLE) ===")
    test_health()
    test_scraper()
    test_pdf_generator()
    test_notifier()
    print("\n=== PRUEBAS CONCLUIDAS ===")
