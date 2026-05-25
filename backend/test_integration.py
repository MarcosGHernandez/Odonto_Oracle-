import requests
import json
import sys

URL = "http://localhost:3000/api/chat"
headers = {"Content-Type": "application/json"}

def test_scraper():
    print("\n=== PRUEBA 1: COTIZACIÓN DE MATERIAL (WEB SCRAPER) ===")
    payload = {
        "messages": [
            {
                "role": "user",
                "content": "Cotiza por favor el precio de Resina Z350 de 3M en la región MX"
            }
        ]
    }
    try:
        response = requests.post(URL, json=payload, headers=headers, timeout=30)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("\nRespuesta del Agente:")
            print(data.get("text"))
        else:
            print("Error:", response.text)
    except Exception as e:
        print("Falla en la petición:", e)

def test_pdf():
    print("\n=== PRUEBA 2: GENERACIÓN DE RECETA (PDF CLINICO) ===")
    payload = {
        "messages": [
            {
                "role": "user",
                "content": "Genera por favor una receta médica formal de Paracetamol 500mg (tomar cada 8 horas por 3 días) para la paciente Maria con ID P-MARIA002"
            }
        ]
    }
    try:
        response = requests.post(URL, json=payload, headers=headers, timeout=30)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("\nRespuesta del Agente:")
            print(data.get("text"))
        else:
            print("Error:", response.text)
    except Exception as e:
        print("Falla en la petición:", e)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "scraper":
            test_scraper()
        elif sys.argv[1] == "pdf":
            test_pdf()
        else:
            test_scraper()
            test_pdf()
    else:
        test_scraper()
        test_pdf()
