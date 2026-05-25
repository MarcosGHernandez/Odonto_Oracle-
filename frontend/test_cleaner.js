function cleanCoreMessages(messages) {
  return messages.map((m) => {
    const role = m.role;
    
    if (role === 'tool') {
      const toolResultParts = [];
      if (Array.isArray(m.content)) {
        for (const part of m.content) {
          if (part.type === 'tool-result') {
            toolResultParts.push({
              type: 'tool-result',
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              result: part.result
            });
          }
        }
      } else if (Array.isArray(m.toolResults)) {
        for (const res of m.toolResults) {
          toolResultParts.push({
            type: 'tool-result',
            toolCallId: res.toolCallId,
            toolName: res.toolName,
            result: res.result
          });
        }
      }
      return {
        role: 'tool',
        content: toolResultParts
      };
    }
    
    if (role === 'assistant') {
      const parts = [];
      let textContent = '';
      
      if (typeof m.content === 'string') {
        textContent = m.content;
      } else if (Array.isArray(m.content)) {
        for (const part of m.content) {
          if (part.type === 'text') {
            textContent += part.text || '';
          } else if (part.type === 'tool-call') {
            parts.push({
              type: 'tool-call',
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              args: part.args
            });
          }
        }
      }
      
      if (Array.isArray(m.toolCalls)) {
        for (const call of m.toolCalls) {
          parts.push({
            type: 'tool-call',
            toolCallId: call.toolCallId,
            toolName: call.toolName,
            args: call.args
          });
        }
      }
      
      if (textContent.trim()) {
        parts.unshift({ type: 'text', text: textContent });
      }
      
      return {
        role: 'assistant',
        content: parts.length > 0 ? parts : ' '
      };
    }
    
    if (role === 'user') {
      let textContent = '';
      if (typeof m.content === 'string') {
        textContent = m.content;
      } else if (Array.isArray(m.content)) {
        for (const part of m.content) {
          if (part.type === 'text') {
            textContent += part.text || '';
          }
        }
      }
      return {
        role: 'user',
        content: textContent || ' '
      };
    }
    
    return {
      role: m.role || 'user',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    };
  });
}

const input = [
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
    toolResults: [
      {
        toolCallId: 'call1',
        toolName: 'buscar_paciente',
        result: { success: true }
      }
    ]
  }
];

console.log("Cleaned:", JSON.stringify(cleanCoreMessages(input), null, 2));
