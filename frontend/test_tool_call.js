const { google } = require('@ai-sdk/google');
const { generateText, tool, zodSchema, jsonSchema } = require('ai');
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

const MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite'
];

async function testModel(modelName) {
  console.log(`\n========================================`);
  console.log(`TESTING MODEL: ${modelName}`);
  console.log(`========================================`);
  
  try {
    const result = await generateText({
      model: google(modelName),
      maxRetries: 0,
      maxSteps: 5,
      system: "Eres un asistente de prueba. Si el usuario te pregunta por un paciente, busca el paciente usando la herramienta y luego responde amigablemente en español con sus datos. No uses emojis.",
      messages: [
        { role: 'user', content: 'Busca el paciente Karla Hernández' }
      ],
      tools: {
        buscar_paciente: {
          description: 'Busca un paciente por nombre en la base de datos',
          parameters: zodSchema(z.object({
            nombre: z.string().describe('El nombre completo del paciente a buscar')
          })),
          inputSchema: zodSchema(z.object({
            nombre: z.string().describe('El nombre completo del paciente a buscar')
          })),
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
        }
      }
    });

    console.log(`[${modelName}] Success!`);
    console.log(`[${modelName}] Text:`, result.text);
    console.log(`[${modelName}] Steps count:`, result.steps.length);
    console.log(`[${modelName}] Steps:`, JSON.stringify(result.steps, null, 2));
    return { success: true, steps: result.steps.length };
  } catch (error) {
    console.log(`[${modelName}] Failed!`);
    console.error(`[${modelName}] Error:`, error.message || error);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("Testing Vercel AI SDK with Gemini...");
  console.log("API Key loaded:", process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "YES" : "NO");

  const results = {};
  for (const model of MODELS) {
    results[model] = await testModel(model);
  }

  console.log("\n========================================");
  console.log("SUMMARY OF RESULTS:");
  console.log(JSON.stringify(results, null, 2));
  console.log("========================================\n");
}

main();
