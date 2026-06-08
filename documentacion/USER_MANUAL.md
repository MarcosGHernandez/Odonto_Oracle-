# Clinical User Manual: Odonto-Oracle

Welcome to **Odonto-Oracle**! Your intelligent clinical assistant and autonomous administrative copilot designed specifically for dental offices and clinics.

This non-technical manual will guide you through all the tools and capabilities available to streamline your clinic's workflow, allowing you to focus on what matters most: the health of your patients.

---

## 1. What is Odonto-Oracle?

Odonto-Oracle is more than just a conversational chat. It is an intelligent assistant integrated with your clinical database that allows you to:
*   **Consult and register patients** by speaking in natural language.
*   **Obtain clinical support (CDSS)** based on the patient's record to prevent prescription errors or contraindications due to allergies.
*   **Schedule and coordinate appointments** with automatic protection against double booking.
*   **Quote dental supplies in real-time** in dental depots in Mexico or the United States.
*   **Generate prescriptions, formal estimates, and treatment plans in PDF** with custom letterhead and digital signature ready to download.

---

## 2. How to Interact with the Assistant Chat

The chat is the operational center of Odonto-Oracle. It is located on your dashboard, and you can speak to it naturally in Spanish or English, just as you would with a human assistant.

### Recommendations for Conversing with the Assistant:
*   **Be specific with names:** Address the assistant by mentioning your patients' names clearly so it can locate them in your records (e.g., *"What are Carlos Slim's allergies?"*).
*   **Delegate sequential tasks:** You can request complete workflows in a single sentence: *"Search for Carlos Slim, quote a 3M resin in Mexico, generate his estimate, and send it to him by email."*
*   **No programming jargon:** You don't need to know code or commands. If the assistant needs information to perform an action, it will ask you politely in the chat in a clinical and professional manner.

---

## 3. Patient Management (Clinical Records)

You can register new patients or update their medical information and history in seconds.

### A. How to Register a New Patient
To register a patient, simply ask in the chat or use the **New Patient** button in the clinical directory:
> **Instruction Example:** *"Register a new patient named Juan Perez, phone number +529511234567, born on August 15, 1990."*

*   **Duplicate Protection:** If you attempt to register a patient who already exists, the system will automatically validate their **Name**, **Phone**, or **Email**. If a match exists in your clinic, it will block the registration with an on-screen warning, avoiding repeated records and clutter in your database.
*   **Clinical Quality Validation:** To ensure complete records, if you do not provide medical history, allergies, or chronic illnesses, the assistant will interactively ask you to add them professionally before saving the record.

### B. How to Modify or Update Patient Information
If the patient's health status, medications, vital signs, or contact information change, update them by conversing:
> **Instruction Example:** *"Edit Juan Perez's record to add that he is now hypertensive and takes Enalapril 10mg."*

### C. How to Delete a Record (Security and Control)
If you need to remove a patient from the system:
1. Go to the **Patients** tab in the sidebar.
2. Locate the patient and click **View** to open their clinical card.
3. In the lower-left corner of the screen, you will find a red button that says **Delete**.
4. Upon clicking it, the system will request a **double security confirmation** and proceed to permanently and irreversibly cascade-delete the clinical record and all associated calendar appointments.

---

## 4. Intelligent Calendar and Appointment Coordination

Odonto-Oracle manages your clinical calendar and protects you from scheduling conflicts.

### A. Check Availability
Before scheduling, you can ask the assistant to review your busy or free slots:
> **Instruction Example:** *"What appointments do I have scheduled for tomorrow?"* or *"Check if I am free on Monday at 10:00 AM."*

### B. Schedule a New Appointment
To register an appointment in your calendar:
> **Instruction Example:** *"Schedule an appointment for Carlos Slim tomorrow at 11:00 AM for a root canal."*

*   **Double-Booking Guardrail (Collision Protection):** If you or your staff attempt to schedule an appointment at the exact date and time already occupied by another patient, **the system will automatically interrupt the save** and notify you in the chat with the following warning message:
    `Calendar conflict: There is already an appointment scheduled for [Date] at [Time]. Please suggest another slot to the doctor.`
    *This prevents overlapping patients in your waiting room and optimizes your appointment slots.*

---

## 5. Supply Quotes and PDF Document Generation

The assistant helps you consolidate your finances and issue pristine prescriptions in premium black-and-white PDF format.

### A. Search and Comparison of Dental Supplies
Quote the materials you need for your treatments directly from regional dental depots in Mexico (MX) or the United States (US):
> **Instruction Example:** *"Quote a 3M Z350 resin in Mexico."*

*The assistant will search online for current prices and present an ordered table with supplier options, prices, and direct purchase links.*

### B. Creation of Estimates, Prescriptions, and Treatment Plans
Once the supplies are selected or the diagnosis is defined:
> **Instruction Example:** *"Generate a formal estimate for Carlos Slim for a root canal and a Z350 resin, in English."*

*   **Instant Dynamic Customization:** The physical PDF is generated instantly and automatically includes your clinic's letterhead (e.g., **"CLINICA DENTAL OAXACA — INTELLIGENT CLINICAL SYSTEM"**) and your name as the responsible signing physician.
*   **Download Link:** Upon completion, the assistant will present a direct download link: `[Download Document]`. Clicking it will allow you to open and print the document from your computer or mobile device.

---

## 6. Clinic Settings Panel (Configuration)

To ensure the assistant signs and labels documents accurately, configure your clinic details in the **Settings** panel in the sidebar:

1.  **Clinic Name:** Enter the business name of your clinic (used in the header of all PDFs).
2.  **Responsible Doctor's Name:** Your full name (used in the doctor signature section).
3.  **Specialty:** Your primary clinical focus (e.g., *Orthodontics, Pediatric Dentistry*).
4.  **Default Region:** Select whether you make your purchases in *Mexico (MX)* or the *United States (US)* to optimize the price comparator.
5.  **Notification Channel:** Set by default to **Email** to send clinical notifications and PDFs directly to the patient's email at no additional cost.
6.  **Contact Phone (WhatsApp):** Register the official WhatsApp number of your clinic. This number will be automatically injected into emails and documents so your patients can contact you directly with a single click from their mobile phones.

---

## 7. Email Notifications

Odonto-Oracle features a highly advanced email communications module designed specifically to be cost-effective and robust in clinical environments.

### A. How to Send Emails from the Chat
You can directly ask the assistant to send notices, estimates, prescriptions, or appointments by email:
> **Instruction Example:** *"Send an email to Carlos Slim letting him know that his root canal estimate is ready for download."*

### B. Sandbox / Demo Simulation Mode (Testing Environment)
To guarantee a 100% smooth, stable, and external-dependency-free Hackathon experience (such as purchasing or registering web domains in the Resend API), the system is configured in **Sandbox / Simulation Mode**:
1.  **Local Generation:** Instead of performing a real email send over the internet, the system autonomously generates the interactive HTML file with a premium design in the server's public folder.
2.  **Instant Preview Link (WOW Factor):** The moment you request the send, the assistant will present the following clickable link in the chat conversation:
    `[View Sent Email](http://localhost:8000/static/emails/email_P-CSLIM001_f09b17.html)`
    *Clicking this link from your computer or mobile device (using the ngrok tunnel) allows the doctor to view exactly how the patient's email was structured and behaves in real-time, validating colors, letterhead, and details without additional costs.*

### C. Safety Features and Clinical Design
*   **Multi-Tenant Data Isolation:** Email notifications are strictly isolated by `clinica_id`. A doctor can only search for and notify patients belonging to their own Clerk-authorized clinic.
*   **Security Masking:** The clinic's clinical ID (`clinica_id`) printed in the interactive email header is automatically masked (e.g., `OO-CLINIC-***`) to protect the clinic's technical confidentiality in shared screens or public demos.
*   **Professional Tone and Formatting Guardrails (Zero Emojis):** All outgoing emails are drafted in a formal, clear, and clinical high-end tone, strictly complying with the **Zero Emojis** rule to maintain the most rigorous standards of medical professionalism.
*   **Signature and WhatsApp Integration:** The email automatically includes the name of the clinic, the name of the responsible doctor, and an interactive button configured with the clinic's official phone number, allowing the patient to open a direct chat with your reception with a single click from the email.
