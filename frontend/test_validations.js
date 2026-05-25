const { generateText } = require('ai');
const { google } = require('@ai-sdk/google');
const path = require('path');
const fs = require('fs');

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
  console.error(err);
}

async function run() {
  const messages = [
    {
      role: 'user',
      content: 'hello'
    },
    {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'let me check'
        },
        {
          type: 'tool-call',
          toolCallId: 'call_1',
          toolName: 'dummy',
          args: {}
        }
      ]
    },
    {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'call_1',
          toolName: 'dummy',
          result: { ok: true }
        }
      ]
    }
  ];

  try {
    const result = await generateText({
      model: google('gemini-3.1-flash-lite'),
      messages,
      system: 'You are a helpful assistant.',
      maxRetries: 0
    });
    console.log("SUCCESS!");
  } catch (e) {
    console.log("FAILED WITH ERROR:");
    console.log(e);
  }
}

run();
