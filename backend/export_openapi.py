import json
from main import app

def export_schema():
    # Extrae el esquema generado dinámicamente por FastAPI
    openapi_schema = app.openapi()
    
    # Lo guarda en un archivo físico json
    with open("openapi.json", "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2, ensure_ascii=False)
        
    print("Success: Esquema OpenAPI exportado correctamente a openapi.json")

if __name__ == "__main__":
    export_schema()
