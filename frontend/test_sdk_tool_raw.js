const { google } = require('@ai-sdk/google');
const { generateText, tool } = require('ai');
const z = require('zod');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
try {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key && !key.startsWith('#')) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (err) {
  console.error("Error reading .env.local manually:", err);
}

async function main() {
  const modelName = 'gemini-2.5-flash';
  console.log(`Testing correct tool execution with ${modelName} using raw Zod object...`);

  try {
    const result = await generateText({
      model: google(modelName),
      maxRetries: 0,
      maxSteps: 5,
      system: "Eres un asistente de prueba. Si el usuario te pregunta por un paciente, busca el paciente usando la herramienta y luego responde amigablemente en español detallando sus alergias y antecedentes.",
      messages: [
        { role: 'user', content: 'Busca el paciente Karla Hernández' }
      ],
      tools: {
        buscar_paciente: tool({
          description: 'Busca un paciente por nombre en la base de datos',
          parameters: z.object({
            nombre: z.string().describe('El nombre completo del paciente a buscar')
          }),
          execute: async ({ nombre }) => {
            console.log(`[${modelName}] >> Tool executed for:`, nombre);
            return {
              status: 'success',
              data: {
                paciente: {
                  nombre: "Karla Hernández",
                  alergias: "Ninguna",
                  historial: "Caries"
                }
              }
            };
          }
        })
      }
    });

    console.log("\n========================================");
    console.log("SUCCESS!");
    console.log("Final text generated:", result.text);
    console.log("Steps count:", result.steps.length);
    console.log("Steps details:", JSON.stringify(result.steps, null, 2));
    console.log("========================================\n");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
