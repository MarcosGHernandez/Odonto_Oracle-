const fs = require('fs');
const path = require('path');

async function testQuickAction(name, userPrompt, clinicaId = 'user_3DmxriguRSKAaMN0IEkyKwhhM3d') {
  console.log(`\n========================================`);
  console.log(`TESTING QUICK ACTION: ${name}`);
  console.log(`Prompt: "${userPrompt}"`);
  console.log(`Clinica ID: ${clinicaId}`);
  console.log(`========================================`);

  const payload = {
    messages: [
      { role: 'user', content: userPrompt }
    ]
  };

  try {
    const startTime = Date.now();
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-clinica-id': clinicaId
      },
      body: JSON.stringify(payload)
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Status: ${res.status} ${res.statusText}`);
      console.error(`Error:`, errText);
      return { success: false, status: res.status, error: errText };
    }

    const data = await res.json();
    console.log(`\nDuration: ${duration}s`);
    console.log(`Response Text:`);
    console.log(data.text);
    console.log(`\n----------------------------------------\n`);
    
    return { success: true, text: data.text, duration };
  } catch (err) {
    console.error('Network Error:', err.message);
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log("Starting quick action integration tests against live Next.js API...");
  
  // Test Case 1: View History (Ver Historial)
  await testQuickAction(
    "VER HISTORIAL (Karla Hernández)",
    "Busca el historial clínico de la paciente Karla Hernández para ver sus antecedentes y alergias."
  );

  // Test Case 2: Search Material (Buscar Material)
  await testQuickAction(
    "BUSCAR MATERIAL (Resina 3M Z350 en MX)",
    "Busca el precio de resina 3M Z350 en MX."
  );

  // Test Case 3: New Prescription (Nueva Receta)
  await testQuickAction(
    "NUEVA RECETA (Karla Hernández)",
    "Genera una receta para Karla Hernández por dolor agudo de muelas por caries profunda proximal, recetando Ibuprofeno 400mg cada 8 horas por 3 días."
  );

  // Test Case 4: Notify Patient (Notificar Paciente)
  await testQuickAction(
    "NOTIFICAR PACIENTE (Karla Hernández)",
    "Envía una notificación de WhatsApp a la paciente Karla Hernández recordando que su cita de revisión es mañana a las 11:00 am."
  );
}

main();
