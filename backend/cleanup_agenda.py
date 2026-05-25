"""
cleanup_agenda.py — Deduplica citas en consultas_db.json.
Elimina entradas con misma (clinica_id, paciente_id, fecha_consulta, diagnostico).
"""
import json
import os

CONSULTAS_PATH = os.path.join("static", "consultas_db.json")

with open(CONSULTAS_PATH, "r", encoding="utf-8") as f:
    consultas = json.load(f)

print(f"Citas antes de deduplicacion: {len(consultas)}")

seen = set()
unique = []
for c in consultas:
    fecha = (c.get("fecha_consulta") or "").strip()
    diag  = (c.get("diagnostico") or "").strip()
    key   = (
        c.get("clinica_id", ""),
        c.get("paciente_id", ""),
        fecha,
        diag,
    )
    if key not in seen:
        seen.add(key)
        c["fecha_consulta"] = fecha
        c["diagnostico"] = diag
        unique.append(c)

print(f"Citas despues de deduplicacion: {len(unique)}")

TENANT = "user_3DmxriguRSKAaMN0IEkyKwhhM3d"
tenant_citas = [c for c in unique if c.get("clinica_id") == TENANT]
print(f"\nCitas del tenant real ({TENANT}): {len(tenant_citas)}")
for c in tenant_citas:
    print(f"  - {c['fecha_consulta']} | {c.get('paciente_id')} | {c.get('diagnostico','N/A')}")

with open(CONSULTAS_PATH, "w", encoding="utf-8") as f:
    json.dump(unique, f, ensure_ascii=False, indent=2)
    f.flush()
    os.fsync(f.fileno())

print("\nArchivo guardado correctamente.")
