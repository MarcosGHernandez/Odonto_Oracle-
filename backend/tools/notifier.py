import os
import json
import time
from datetime import datetime
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from dotenv import load_dotenv

load_dotenv()

def enviar_notificacion_paciente(paciente_id: str, mensaje_texto: str, canal: str = 'whatsapp', clinica_id: str = 'OO-CLINIC-001') -> str:
    """
    Envía una notificación al paciente vía WhatsApp, SMS o Correo Electrónico.
    Si paciente_id es un ID clínico (ej. P-CSLIM001), resuelve su teléfono o email desde la base de datos.
    
    Args:
        paciente_id (str): ID clínico, teléfono o email del paciente.
        mensaje_texto (str): El cuerpo del mensaje a enviar.
        canal (str): Canal de envío ('whatsapp', 'sms' o 'email').
        clinica_id (str): ID de la clínica (tenant) activo para aislar los datos.
        
    Returns:
        str: Mensaje de éxito o error descriptivo para el LLM.
    """
    try:
        if not paciente_id or not mensaje_texto:
            return "System Error: Faltan datos (paciente_id o mensaje_texto) para enviar la notificación."

        canal_clean = canal.lower().strip() if canal else 'whatsapp'

        # =========================================================================
        # CANAL: EMAIL (NUEVA ESTRATEGIA DE 3 NIVELES CON MODO SIMULACIÓN)
        # =========================================================================
        if canal_clean == 'email':
            email_destino = None
            nombre_paciente = paciente_id

            # Si el paciente_id ya contiene una dirección de correo, la tomamos directamente
            if '@' in paciente_id:
                email_destino = paciente_id
                nombre_paciente = paciente_id.split('@')[0]
            else:
                # Resolver paciente en Elasticsearch o Fallback JSON
                from tools.search import buscar_paciente
                res = buscar_paciente(paciente_id, clinica_id)
                if isinstance(res, dict) and res.get("status") == "success" and "paciente" in res:
                    paciente_data = res["paciente"]
                    email_destino = paciente_data.get("email")
                    nombre_paciente = paciente_data.get("nombre", paciente_id)
                    if not email_destino:
                        return f"System Error: El paciente '{paciente_id}' fue encontrado en la base de datos, pero no cuenta con un correo electrónico registrado."
                    print(f"[Notifier] ID '{paciente_id}' resuelto exitosamente al correo: {email_destino} para clínica {clinica_id}")
                else:
                    # Intentamos buscar directamente en el fallback local JSON
                    from database_fallback import search_fallback_patient
                    p_local = search_fallback_patient(paciente_id, clinica_id)
                    if p_local and p_local.get("email"):
                        email_destino = p_local.get("email")
                        nombre_paciente = p_local.get("nombre", paciente_id)
                        print(f"[Notifier] ID '{paciente_id}' resuelto en fallback local al correo: {email_destino}")
                    else:
                        return f"System Error: No se encontró al paciente '{paciente_id}' en el sistema (clínica '{clinica_id}') o no tiene un correo electrónico registrado. Por favor, solicita al doctor registrar el correo del paciente."

            # Formatear fecha actual para el membrete clínico
            fecha_actual = datetime.now().strftime("%Y-%m-%d %H:%M")

            # Aislamiento visual del clinica_id (ej. OO-CLINIC-001 -> OO-CLINIC-***) para confidencialidad en demos
            masked_clinic = clinica_id
            if len(clinica_id) > 10:
                masked_clinic = clinica_id[:10] + "****"

            # Pre-formatear mensaje_texto para evitar barras invertidas en el f-string (SyntaxError en Python <3.12)
            mensaje_html = mensaje_texto.replace('\\n', '<br>').replace('\n', '<br>')

            # Plantilla HTML Premium Minimalista (Estilo brutalista premium en Blanco y Negro, CERO emojis)
            html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Notificación Clínica Odonto-Oracle</title>
    <style>
        body {{
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #111827;
            -webkit-font-smoothing: antialiased;
        }}
        .wrapper {{
            width: 100%;
            table-layout: fixed;
            background-color: #f3f4f6;
            padding: 40px 0;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 2px solid #111111;
            box-shadow: 6px 6px 0px #111111;
        }}
        .header {{
            background-color: #111111;
            padding: 24px;
            text-align: center;
            border-bottom: 2px solid #111111;
        }}
        .header h1 {{
            margin: 0;
            color: #ffffff;
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
        }}
        .metadata {{
            padding: 20px 24px;
            background-color: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
        }}
        .metadata table {{
            width: 100%;
            border-collapse: collapse;
        }}
        .metadata td {{
            padding: 4px 0;
        }}
        .label {{
            font-weight: 700;
            color: #4b5563;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            width: 100px;
        }}
        .value {{
            color: #111827;
        }}
        .content {{
            padding: 32px 24px;
            line-height: 1.6;
            font-size: 15px;
        }}
        .content p {{
            margin: 0 0 16px 0;
        }}
        .content blockquote {{
            margin: 24px 0;
            padding: 16px;
            border-left: 4px solid #111111;
            background-color: #f9fafb;
            font-style: italic;
            color: #374151;
        }}
        .footer {{
            background-color: #fafafa;
            padding: 24px;
            border-top: 2px solid #111111;
            text-align: center;
        }}
        .footer p {{
            margin: 0;
            font-size: 11px;
            color: #6b7280;
            font-family: monospace;
            text-transform: uppercase;
            letter-spacing: 1px;
            line-height: 1.5;
        }}
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>Odonto-Oracle // Clinical System</h1>
            </div>
            <div class="metadata">
                <table>
                    <tr>
                        <td class="label">Clínica:</td>
                        <td class="value">{masked_clinic}</td>
                    </tr>
                    <tr>
                        <td class="label">Paciente:</td>
                        <td class="value">{nombre_paciente}</td>
                    </tr>
                    <tr>
                        <td class="label">Fecha:</td>
                        <td class="value">{fecha_actual}</td>
                    </tr>
                </table>
            </div>
            <div class="content">
                <p>Estimado(a) paciente,</p>
                <p>Le hacemos llegar la siguiente notificación clínica y administrativa oficial desde nuestra plataforma:</p>
                <blockquote>
                    {mensaje_html}
                </blockquote>
                <p>Si tiene alguna duda o requiere agendar una cita de seguimiento, por favor comuníquese directamente con la recepción de la clínica.</p>
            </div>
            <div class="footer">
                <p>Notificación automática confidencial. No responder a este correo.</p>
                <p style="margin-top: 8px;">Odonto-Oracle &copy; 2026. Todos los derechos reservados.</p>
            </div>
        </div>
    </div>
</body>
</html>
"""

            # FORZAR MODO SIMULACIÓN PARA FASE DE PRUEBAS / DEMO HACKATHON
            # (El usuario solicitó mantenerlo estrictamente en modo simulación/fase de prueba)
            static_emails_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "emails")
            os.makedirs(static_emails_dir, exist_ok=True)
            
            import uuid
            file_id = f"{paciente_id}_{uuid.uuid4().hex[:6]}"
            for char in ["+", ":", "@", ".", "-"]:
                file_id = file_id.replace(char, "_")
            
            filename = f"email_{file_id}.html"
            filepath = os.path.join(static_emails_dir, filename)
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(html_content)
                
            public_url = os.getenv("PUBLIC_SERVER_URL", "http://localhost:8000")
            if public_url.endswith("/"):
                public_url = public_url[:-1]
                
            preview_url = f"{public_url}/static/emails/{filename}"
            print(f"[SIMULACIÓN EMAIL HACKATHON guardado en {filepath}]: URL: {preview_url}")
            return f"Success: [Modo Simulación - Fase de Prueba] Notificación de correo guardada exitosamente. En esta fase demostrativa del Hackathon, el sistema simula el envío y el doctor puede visualizar el contenido en tiempo real en la siguiente URL: {preview_url}"

        # =========================================================================
        # CANALES TELEFÓNICOS (WHATSAPP / SMS CON TWILIO)
        # =========================================================================
        telefono_destino = paciente_id
        
        # Si paciente_id es un ID clínico, resolverlo
        if paciente_id.startswith('P-') or not (paciente_id.startswith('+') or paciente_id.startswith('whatsapp:+')):
            from tools.search import buscar_paciente
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
            print(f"[SIMULACIÓN {canal_clean.upper()} a {telefono_destino} emisor: {from_whatsapp_number if canal_clean == 'whatsapp' else from_sms_number}]: {mensaje_texto}")
            return f"Success: Notificación (simulada) enviada correctamente por {canal_clean} al número {telefono_destino}."

        # MODO PRODUCCIÓN
        client = Client(account_sid, auth_token)
        
        # Formatear el número destino para Twilio WhatsApp
        if canal_clean == 'whatsapp' and not telefono_destino.startswith('whatsapp:'):
            to_number = f"whatsapp:{telefono_destino}"
        else:
            to_number = telefono_destino
            
        from_number = from_whatsapp_number if canal_clean == 'whatsapp' else from_sms_number

        message = client.messages.create(
            body=mensaje_texto,
            from_=from_number,
            to=to_number
        )

        return f"Success: Notificación real enviada al número {telefono_destino} desde {from_number}. ID: {message.sid}"

    except TwilioRestException as e:
        print(f"[Twilio Error] Code: {e.code}, HTTP Status: {e.status}, Message: {e.msg}")
        return f"System Error: Error real de la API de Twilio (Código {e.code}, HTTP {e.status}). Detalle: '{e.msg}'. Por favor, solicita al doctor confirmar que el número del paciente está en formato internacional con código de país (ej. +5219511234567). Si la cuenta está en modo Sandbox de WhatsApp, recuerda que el paciente debe enviar primero el mensaje de activación (ej. 'join ...') al número Sandbox para recibir notificaciones."
    except Exception as e:
        # REGLA DE RESILIENCIA: No exponer error interno, devolver instrucción plana
        return f"System Error: No se pudo enviar el mensaje. Detalle: {str(e)}"

if __name__ == "__main__":
    # Prueba local
    print(enviar_notificacion_paciente("+521234567890", "Recuerde su cita mañana a las 10:00 AM."))


