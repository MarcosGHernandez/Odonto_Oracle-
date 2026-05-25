# Guía de Producción: Envío de Mensajes y WhatsApp sin Restricciones (Twilio)

Para poder enviar mensajes SMS o de WhatsApp a **cualquier número telefónico** (y no solo a los números verificados de prueba del Sandbox), es obligatorio migrar la cuenta de Twilio a producción y cumplir con los protocolos de validación de Meta y los operadores.

Sigue estos **5 pasos clave** para llevar el sistema de notificaciones de Odonto-Oracle a producción:

---

## 1. Mejorar la Cuenta de Twilio (Upgrade Account)
Por defecto, las cuentas nuevas de Twilio se crean en modo **Trial (Prueba)**.
1. Inicia sesión en la [Consola de Twilio](https://console.twilio.com/).
2. Haz clic en el botón **"Upgrade Project"** (Mejorar Proyecto) en la barra superior.
3. Introduce los datos de facturación de la clínica dental (tarjeta de crédito/débito) y realiza una recarga mínima de saldo (típicamente $20 USD).
4. Esto eliminará la etiqueta *"Sent from your Twilio trial account"* de todos los SMS enviados.

---

## 2. Configurar WhatsApp en Producción (Meta Business API)
Para WhatsApp en producción, no puedes usar el número genérico del sandbox (`+1 415 523 8886`). Debes habilitar tu propio número de teléfono corporativo:

1. **Obtener un número limpio:** Necesitas un número telefónico que **no** tenga una cuenta de WhatsApp activa (si la tiene, debes borrarla desde la app de WhatsApp de tu celular antes de registrarla en Twilio).
2. **Registro en Twilio:**
   * Ve a **Conversations > Senders > WhatsApp Senders** en la consola de Twilio.
   * Haz clic en **"Register a WhatsApp Sender"**.
   * Introduce el número de la clínica dental.
3. **Validación con Meta (Embedded Signup):**
   * Completa el asistente en pantalla iniciando sesión con la cuenta de Facebook de la clínica.
   * Selecciona o crea la cuenta de **Meta Business Manager** (Administrador comercial de Facebook).
   * **Importante:** Tu cuenta comercial de Meta debe estar verificada con documentos legales de la clínica para poder enviar mensajes de forma ilimitada.
4. **Verificación del número:** Recibirás una llamada o SMS con un código de 6 dígitos para validar la pertenencia del número telefónico.

---

## 3. Crear y Registrar Plantillas de WhatsApp (WhatsApp Templates)
En producción, WhatsApp **prohíbe** iniciar una conversación con un cliente mediante texto libre. Debes usar una plantilla pre-aprobada por Meta. Solo si el paciente responde a esa plantilla, se abre una "ventana de conversación de 24 horas" donde puedes mandarle texto libre.

1. Ve a **Messaging > Templates** en la consola de Twilio.
2. Crea una nueva plantilla para tus presupuestos o recordatorios de cita. Por ejemplo:
   > *"Hola {{1}}, le escribimos de la Clínica Odonto-Oracle para notificarle que su {{2}} está listo. Puede consultarlo aquí: {{3}}"*
3. Meta tarda entre 10 minutos y 24 horas en aprobar la plantilla.
4. En tu código (`notifier.py`), deberás enviar los parámetros de la plantilla en lugar de texto plano libre para iniciar conversaciones.

---

## 4. Configurar SMS en Producción (Cumplimiento Regulatorio)
Si vas a enviar recordatorios por SMS clásicos:
* **En México y LATAM:** Solo necesitas comprar un número local habilitado para SMS en Twilio (o usar un Short Code / remitente alfanumérico pre-aprobado) para evitar que los operadores bloqueen el tráfico catalogándolo como spam.
* **En Estados Unidos (A2P 10DLC):** Si mandas SMS a números de EE. UU., los operadores exigen registrar una "Campaña A2P 10DLC" detallando qué tipo de mensajes envías (ej. alertas médicas) y los términos de uso del cliente. Si no se registra, los SMS a EE. UU. serán rechazados automáticamente.

---

## 5. Actualizar Variables de Entorno (.env)
Una vez que tengas tu número de producción y tu cuenta comercial verificada, actualiza las variables de entorno en el archivo `.env` del backend:

```env
# Credenciales principales de Twilio en Producción
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  # Tu Account SID real
TWILIO_AUTH_TOKEN=your_production_auth_token_here     # Tu Token real de producción

# Números de Teléfono de Producción (Reemplazar sandbox por los propios)
TWILIO_WHATSAPP_NUMBER=whatsapp:+529511234567          # Tu número corporativo verificado de WhatsApp
TWILIO_SMS_NUMBER=+529511234567                       # Tu número de SMS verificado
```

---

## Resiliencia ante Fallos en Producción
El archivo `backend/tools/notifier.py` ya está programado con un mecanismo de **Simulación Inteligente**:
* Si no configuras las credenciales `TWILIO_ACCOUNT_SID` o `TWILIO_AUTH_TOKEN`, el sistema detecta de forma autónoma la ausencia de credenciales y simula el envío con éxito en los logs, previniendo que el backend se caiga o arroje un error 500 al doctor.
* Si el número de destino es inválido, retorna una instrucción limpia que permite al agente LLM notificar el problema con elegancia en lugar de crashear el servidor.
