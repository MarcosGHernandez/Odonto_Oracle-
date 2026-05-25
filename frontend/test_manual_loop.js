const { google } = require('@ai-sdk/google');
const { generateText, zodSchema } = require('ai');
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
  const modelName = 'gemini-3.1-flash-lite';
  console.log(`Manual loop test using: ${modelName}`);

  try {
    // 1. Initial turn: User asks to search for patient
    console.log("\n--- TURN 1: User request -> Model tool call ---");
    const res1 = await generateText({
      model: google(modelName),
      system: "Eres un asistente clínico de prueba. Si el usuario te pregunta por un paciente, DEBES buscarlo usando la herramienta 'buscar_paciente' y luego responder amigablemente en español detallando sus alergias y antecedentes.",
      messages: [
        { role: 'user', content: 'Busca el paciente Karla Hernández' }
      ],
      tools: {
        buscar_paciente: {
          description: 'Busca un paciente por nombre en la base de datos',
          parameters: zodSchema(z.object({
            nombre: z.string().describe('El nombre del paciente')
          })),
          inputSchema: zodSchema(z.object({
            nombre: z.string().describe('El nombre del paciente')
          }))
        }
      }
    });

    console.log("Res1 raw tool calls:", JSON.stringify(res1.toolCalls, null, 2));

    if (res1.toolCalls && res1.toolCalls.length > 0) {
      const toolCall = res1.toolCalls[0];
      console.log(`Model generated tool call ID: ${toolCall.toolCallId} with args:`, toolCall.args);

      // 2. Second turn: Feed the tool call and tool result back to the model to get final text
      console.log("\n--- TURN 2: Tool result -> Model final text ---");
      const res2 = await generateText({
        model: google(modelName),
        system: "Eres un asistente clínico de prueba. Si el usuario te pregunta por un paciente, DEBES buscarlo usando la herramienta 'buscar_paciente' y luego responder amigablemente en español detallando sus alergias y antecedentes.",
        messages: [
          { role: 'user', content: 'Busca el paciente Karla Hernández' },
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId: toolCall.toolCallId,
                toolName: 'buscar_paciente',
                args: toolCall.args
              }
            ]
          },
          {
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId: toolCall.toolCallId,
                toolName: 'buscar_paciente',
                result: {
                  status: 'success',
                  data: {
                    paciente: {
                      nombre: "Karla Hernández",
                      alergias: "Alergia a la penicilina",
                      historial: "Caries profundas en molares inferiores, hipertensión controlada."
                    }
                  }
                }
              }
            ]
          }
        ]
      });

      console.log("Model Final Text Response:");
      console.log(res2.text);
    } else {
      console.log("Error: Model did not generate a tool call in Turn 1.");
    }
  } catch (error) {
    console.error("Error during manual loop execution:", error);
  }
}

main();
