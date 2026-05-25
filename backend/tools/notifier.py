import os
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from dotenv import load_dotenv

load_dotenv()

def enviar_notificacion_paciente(paciente_id: str, mensaje_texto: str, canal: str = 'whatsapp', clinica_id: str = 'OO-CLINIC-001') -> str:
    """
    Envía una notificación al paciente (por defecto vía WhatsApp).
    Si paciente_id es un ID clínico (ej. P-CSLIM001), resuelve su teléfono desde la base de datos.
    
    Args:
        paciente_id (str): ID o número de teléfono del paciente.
        mensaje_texto (str): El mensaje a enviar.
        canal (str): Canal de envío ('whatsapp' o 'sms').
        clinica_id (str): ID de la clínica (tenant) activo para aislar los datos.
        
    Returns:
        str: Mensaje de éxito o error descriptivo para el LLM.
    """
    try:
        if not paciente_id or not mensaje_texto:
            return "System Error: Faltan datos (paciente_id o mensaje_texto) para enviar la notificación."

        telefono_destino = paciente_id
        
        # Si paciente_id es un ID clínico, resolverlo
        if paciente_id.startswith('P-') or not (paciente_id.startswith('+') or paciente_id.startswith('whatsapp:+')):
            from tools.search import buscar_paciente
            # Utilizar el clinica_id dynamic para aislamiento
            res = buscar_paciente(paciente_id, clinica_id)
            if isinstance(res, dict) and res.get("status") == "success" and "paciente" in res:
                paciente_data = res["paciente"]
                telefono_destino = paciente_data.get("telefono")
                if not telefono_destino:
                    return f"System Error: El paciente '{paciente_id}' fue encontrado en la base de datos, pero no cuenta con un número de teléfono registrado."
                print(f"[Notifier] ID '{paciente_id}' resuelto exitosamente al teléfono: {telefono_destino} para clínica {clinica_id}")
            else:
                # Si no se encuentra, buscar en fallback JSON local
                from database_fallback import search_fallback_patient
                p_local = search_fallback_patient(paciente_id, clinica_id)
                if p_local and p_local.get("telefono"):
                    telefono_destino = p_local.get("telefono")
                    print(f"[Notifier] ID '{paciente_id}' resuelto en fallback local al teléfono: {telefono_destino}")
                else:
                    return f"System Error: No se encontró al paciente '{paciente_id}' en el sistema (clínica '{clinica_id}'). Asegúrate de que el paciente existe."

        # Cargar números emisores dinámicos desde settings_{clinica_id}.json si existe
        import json
        settings_filename = f"settings_{clinica_id}.json"
        settings_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", settings_filename)
        custom_whatsapp = None
        custom_sms = None
        if os.path.exists(settings_path):
            try:
                with open(settings_path, "r", encoding="utf-8") as f:
                    settings_data = json.load(f)
                    custom_whatsapp = settings_data.get("twilio_whatsapp_number")
                    custom_sms = settings_data.get("twilio_sms_number")
            except Exception as e:
                print(f"[Notifier] Error al cargar {settings_filename}: {e}")

        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        
        # Priorizar números de Ajustes, luego .env, y finalmente fallback de Sandbox
        from_whatsapp_number = custom_whatsapp or os.getenv("TWILIO_WHATSAPP_NUMBER") or "whatsapp:+14155238886"
        from_sms_number = custom_sms or os.getenv("TWILIO_SMS_NUMBER") or "+14155238886"

        # MODO SIMULACIÓN (Ideal para Hackathon MVP)
        # Si las llaves no existen en el .env, simplemente simula sin fallar
        if not account_sid or not auth_token:
            print(f"[SIMULACIÓN {canal.upper()} a {telefono_destino} emisor: {from_whatsapp_number if canal.lower() == 'whatsapp' else from_sms_number}]: {mensaje_texto}")
            return f"Success: Notificación (simulada) enviada correctamente por {canal} al número {telefono_destino}."

        # MODO PRODUCCIÓN
        client = Client(account_sid, auth_token)
        
        # Formatear el número destino para Twilio WhatsApp
        if canal.lower() == 'whatsapp' and not telefono_destino.startswith('whatsapp:'):
            to_number = f"whatsapp:{telefono_destino}"
        else:
            to_number = telefono_destino
            
        from_number = from_whatsapp_number if canal.lower() == 'whatsapp' else from_sms_number

        message = client.messages.create(
            body=mensaje_texto,
            from_=from_number,
            to=to_number
        )

        return f"Success: Notificación real enviada al número {telefono_destino} desde {from_number}. ID: {message.sid}"

    except TwilioRestException as e:
        # Capturar errores reales de la API/Webhook de Twilio de manera descriptiva
        print(f"[Twilio Error] Code: {e.code}, HTTP Status: {e.status}, Message: {e.msg}")
        return f"System Error: Error real de la API de Twilio (Código {e.code}, HTTP {e.status}). Detalle: '{e.msg}'. Por favor, solicita al doctor confirmar que el número del paciente está en formato internacional con código de país (ej. +5219511234567). Si la cuenta está en modo Sandbox de WhatsApp, recuerda que el paciente debe enviar primero el mensaje de activación (ej. 'join ...') al número Sandbox para recibir notificaciones."
    except Exception as e:
        # REGLA DE RESILIENCIA: No exponer error interno, devolver instrucción plana
        return f"System Error: No se pudo enviar el mensaje. Detalle: {str(e)}"

if __name__ == "__main__":
    # Prueba local
    print(enviar_notificacion_paciente("+521234567890", "Recuerde su cita mañana a las 10:00 AM."))

