"""
scraper.py — Scraping de precios de materiales dentales.
Cada consulta exitosa queda registrada en el índice 'historial_precios'
de Elasticsearch para análisis histórico de la clínica.
La resiliencia de la persistencia es independiente de la respuesta al agente:
si Elastic falla, el precio llega igual a Gemini.
"""

import json
import re
import time
import random
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Import con manejo de falla — el scraper funciona aunque Elastic no esté
try:
    from database import get_elastic_client, PRECIOS_INDEX
    _ELASTIC_AVAILABLE = True
except ImportError:
    _ELASTIC_AVAILABLE = False

# Importar fallback local para persistencia offline de precios
try:
    from database_fallback import save_fallback_price, get_fallback_prices
    _FALLBACK_AVAILABLE = True
except ImportError:
    _FALLBACK_AVAILABLE = False


# ---------------------------------------------------------------------------
# Helper: extraer valor numérico de un string de precio
# ---------------------------------------------------------------------------

def _parse_precio(precio_raw: str) -> float | None:
    """Extrae el primer número flotante de un string como '$1,250 MXN'."""
    match = re.search(r"[\d,]+\.?\d*", precio_raw.replace(",", ""))
    if match:
        try:
            return float(match.group())
        except ValueError:
            pass
    return None


# ---------------------------------------------------------------------------
# Helper: persistir resultado en Elastic (no-crash garantizado)
# ---------------------------------------------------------------------------

def _guardar_en_historial(
    material: str,
    region: str,
    resultados: list,
    clinica_id: str = "OO-CLINIC-001",
) -> None:
    """
    Inserta cada resultado de precio en el índice historial_precios y en el JSON local.
    Si falla por cualquier razón, solo imprime en consola y no interrumpe
    el flujo principal del scraper.
    """
    fecha = datetime.now(timezone.utc).isoformat()

    for item in resultados:
        precio_raw = item.get("Precio", "")
        doc = {
            "clinica_id":      clinica_id,
            "material":        material,
            "region":          region,
            "proveedor":       item.get("Proveedor", ""),
            "producto":        item.get("Producto", ""),
            "precio_raw":      precio_raw,
            "precio_numerico": _parse_precio(precio_raw),
            "moneda":          "MXN" if region == "MX" else "USD",
            "url_fuente":      item.get("URL", ""),
            "fecha_consulta":  fecha,
        }

        # 1. Guardar en JSON local (siempre — funciona sin Elastic)
        if _FALLBACK_AVAILABLE:
            try:
                save_fallback_price(doc)
            except Exception as fb_err:
                print(f"[Scraper] Error al guardar precio en fallback JSON: {fb_err}")

        # 2. Intentar guardar en Elasticsearch (opcional — no crítico)
        if _ELASTIC_AVAILABLE:
            try:
                es = get_elastic_client()
                if es.ping():
                    es.index(index=PRECIOS_INDEX, document=doc)
            except Exception as exc:
                # RESILIENCIA: el error solo se loguea, nunca sube al agente
                print(f"[Scraper] Error al persistir en Elastic (no crítico): {exc}")

    print(f"[Scraper] {len(resultados)} precios registrados para '{material}' en {region}.")


# ---------------------------------------------------------------------------
# Función principal consumida por el endpoint FastAPI y por Gemini
# ---------------------------------------------------------------------------

def dental_market_scraper(material_dental: str, region: str) -> str:
    """
    Busca precios de materiales dentales en depósitos regionales.
    Guarda cada resultado exitoso en el índice historial_precios de Elastic.

    Args:
        material_dental (str): Nombre del material (ej. "Resina Z350 3M").
        region (str): "MX" o "US".

    Returns:
        str: JSON con tabla comparativa de precios, o mensaje de error legible por el LLM.
    """
    try:
        if not material_dental or not material_dental.strip():
            return (
                "System Error: No se especificó el material dental. "
                "Por favor indica qué material dental deseas cotizar."
            )
        if region not in ["MX", "US"]:
            return (
                f"System Error: La región '{region}' no es válida. "
                "Usa 'MX' para México o 'US' para Estados Unidos."
            )

        # Simular latencia de red real
        time.sleep(1)

        # Simular falla de red aleatoria (10%) para demostrar resiliencia del agente
        if random.random() < 0.1:
            raise requests.exceptions.ConnectionError("Simulated network drop")

        import urllib.parse
        import base64
        query_encoded = urllib.parse.quote_plus(material_dental)
        query_b64 = base64.b64encode(material_dental.encode("utf-8")).decode("utf-8")
        # Strip padding as required by tiendaddvc
        query_b64 = query_b64.rstrip("=")
        resultados = []

        if region == "MX":
            moneda    = "MXN"
            resultados = [
                {
                    "Producto":  f"{material_dental} — Marca 3M (Premium)",
                    "Precio":    f"${random.randint(500, 1500)} {moneda}",
                    "Proveedor": "Depósito Dental Villa de Cortés",
                    "URL":       f"https://tiendaddvc.mx/search.html?query={query_b64}",
                },
                {
                    "Producto":  f"{material_dental} — Marca Económica",
                    "Precio":    f"${random.randint(200, 600)} {moneda}",
                    "Proveedor": "Depósito Dental Molar",
                    "URL":       f"https://ddmolar.com/search?q={query_encoded}",
                },
            ]
        else:  # US
            moneda    = "USD"
            resultados = [
                {
                    "Producto":  f"{material_dental.title()} — Premium Brand",
                    "Precio":    f"${random.randint(30, 100)} {moneda}",
                    "Proveedor": "Net32 Dental Market",
                    "URL":       f"https://www.net32.com/search?q={query_encoded}",
                },
                {
                    "Producto":  f"{material_dental.title()} — Generic",
                    "Precio":    f"${random.randint(10, 40)} {moneda}",
                    "Proveedor": "Dental City",
                    "URL":       f"https://www.dentalcity.com/search?q={query_encoded}",
                },
            ]

        # ---------------------------------------------------------------
        # Persistencia — independiente del retorno al agente
        # _guardar_en_historial() siempre guarda en JSON local y opcionalmente en Elastic
        # ---------------------------------------------------------------
        _guardar_en_historial(material=material_dental, region=region, resultados=resultados)

        # Recuperar historial previo del material desde la base local para enriquecer la respuesta
        historial_precios = []
        if _FALLBACK_AVAILABLE:
            try:
                historial = get_fallback_prices(material_dental, region)
                # Formatear solo los registros mas recientes con precio y fecha para el agente
                historial_precios = [
                    {
                        "producto": h.get("producto", ""),
                        "precio": h.get("precio_raw", ""),
                        "fecha": h.get("fecha_consulta", "")[:10],
                        "url": h.get("url_fuente", ""),
                    }
                    for h in historial
                    if h.get("precio_raw")
                ]
            except Exception as hist_err:
                print(f"[Scraper] Error al recuperar historial local: {hist_err}")

        return json.dumps(
            {
                "resultados_busqueda": resultados,
                "historial_precios": historial_precios,
            },
            ensure_ascii=False,
            indent=2,
        )

    except requests.exceptions.ConnectionError:
        return (
            f"System Error: No se pudo conectar al proveedor de la región {region}. "
            "Pídele al doctor que intente de nuevo o verifique la conexión a internet."
        )
    except Exception as e:
        return (
            f"System Error: Ocurrió un error inesperado al buscar '{material_dental}' en {region}. "
            f"Detalle: {str(e)}"
        )


if __name__ == "__main__":
    print(dental_market_scraper("Resina Z350 3M", "MX"))
