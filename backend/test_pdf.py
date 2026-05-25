import os
import sys
from tools.pdf_generator import generar_documento_clinico

def test():
    datos_paciente = {
        "paciente_id": "P-MARIA002",
        "nombre": "Maria Hernandez",
        "clinica_id": "OO-CLINIC-001",
        "alergias": "Ninguna"
    }
    
    contenido_medico = "Receta Medica:\nParacetamol 500mg\nTomar 1 tableta cada 8 horas por 3 dias para mitigar el dolor."
    
    resultado = generar_documento_clinico(
        tipo_documento="receta",
        datos_paciente=datos_paciente,
        contenido_medico=contenido_medico,
        idioma="es"
    )
    
    print("\n--- RESULTADO DE LA FUNCIÓN ---")
    print(resultado)

if __name__ == "__main__":
    test()
