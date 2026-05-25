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

// ---------------------------------------------------------------------------
// Resilient Tool Loop Function
// ---------------------------------------------------------------------------
async function generateTextWithResilientSteps({ model, system, messages, tools, maxSteps = 5 }) {
  let currentMessages = [...messages];
  let steps = [];
  let currentStep = 0;
  
  while (currentStep < maxSteps) {
    console.log(`\n[Resilient Loop] Step ${currentStep} starting...`);
    const res = await generateText({
      model,
      system,
      messages: currentMessages,
      tools,
      maxRetries: 0
    });
    
    // Capture step information
    steps.push({
      stepNumber: currentStep,
      toolCalls: res.toolCalls || [],
      finishReason: res.finishReason,
      text: res.text
    });
    
    if (res.toolCalls && res.toolCalls.length > 0) {
      console.log(`[Resilient Loop] Step ${currentStep} generated ${res.toolCalls.length} tool calls.`);
      
      // Push assistant message with tool calls
      const assistantMsg = {
        role: 'assistant',
        content: res.toolCalls.map(tc => ({
          type: 'tool-call',
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          args: tc.args
        }))
      };
      currentMessages.push(assistantMsg);
      
      // Execute each tool
      const toolResults = [];
      for (const tc of res.toolCalls) {
        const toolDef = tools[tc.toolName];
        if (toolDef && toolDef.execute) {
          console.log(`[Resilient Loop] Executing tool '${tc.toolName}'...`);
          try {
            const result = await toolDef.execute(tc.args);
            toolResults.push({
              type: 'tool-result',
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              result
            });
          } catch (err) {
            console.error(`[Resilient Loop] Error executing tool '${tc.toolName}':`, err);
            toolResults.push({
              type: 'tool-result',
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              result: { status: 'error', message: err.message }
            });
          }
        }
      }
      
      // Push tool message with results
      const toolMsg = {
        role: 'tool',
        content: toolResults
      };
      currentMessages.push(toolMsg);
      
      currentStep++;
    } else {
      console.log(`[Resilient Loop] Step ${currentStep} finished with no tool calls. Final text generated.`);
      return {
        text: res.text,
        steps,
        toolCalls: res.toolCalls,
        finishReason: res.finishReason
      };
    }
  }
  
  const lastRes = steps[steps.length - 1];
  return {
    text: lastRes.text,
    steps,
    toolCalls: lastRes.toolCalls,
    finishReason: lastRes.finishReason
  };
}

async function main() {
  const modelName = 'gemini-3.1-flash-lite';
  console.log(`Running resilient loop diagnostic test using: ${modelName}`);

  const tools = {
    buscar_paciente: {
      description: 'Busca un paciente por nombre en la base de datos',
      parameters: zodSchema(z.object({
        nombre: z.string().describe('El nombre del paciente')
      })),
      inputSchema: zodSchema(z.object({
        nombre: z.string().describe('El nombre del paciente')
      })),
      execute: async ({ nombre }) => {
        console.log(">> Tool execution inside loop for:", nombre);
        return {
          status: 'success',
          data: {
            paciente: {
              nombre: "Karla Hernández",
              alergias: "Alergia a la penicilina",
              historial: "Caries profundas en molares inferiores, hipertensión controlada."
            }
          }
        };
      }
    }
  };

  try {
    const result = await generateTextWithResilientSteps({
      model: google(modelName),
      maxSteps: 5,
      system: "Eres un asistente de prueba. Busca el paciente usando la herramienta y luego responde en español detallando sus alergias e historial. No uses emojis.",
      messages: [
        { role: 'user', content: 'Busca el paciente Karla Hernández' }
      ],
      tools
    });

    console.log("\n========================================");
    console.log("RESULT TEXT:\n", result.text);
    console.log("STEPS COUNT:", result.steps.length);
    console.log("STEPS:", JSON.stringify(result.steps, null, 2));
    console.log("========================================\n");
  } catch (error) {
    console.error("Resilient loop error:", error);
  }
}

main();
