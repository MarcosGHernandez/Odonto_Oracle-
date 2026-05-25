const { convertToModelMessages } = require('ai');

try {
  const messages = [
    { role: 'user', content: 'hello' },
    {
      role: 'assistant',
      content: [
        {
          type: 'tool-call',
          toolCallId: 'call1',
          toolName: 'buscar_paciente',
          args: { nombre: 'Karla' }
        }
      ]
    },
    {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'call1',
          toolName: 'buscar_paciente',
          result: { success: true }
        }
      ]
    }
  ];

  // Let's see if convertToModelMessages expects other fields or if there's a different way to construct them
  console.log("Validating messages:");
  for (let i = 0; i < messages.length; i++) {
    console.log(`Msg ${i}: role=${messages[i].role}, content type=${typeof messages[i].content}`);
  }
} catch (err) {
  console.error(err);
}
