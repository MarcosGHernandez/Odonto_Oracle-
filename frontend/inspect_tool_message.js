const ai = require('ai');
const z = require('zod');

// Let's find all exported keys that end with Schema or contain Message
const messageKeys = Object.keys(ai).filter(k => k.includes('Message') || k.includes('Schema'));
console.log("Exported message/schema keys:", messageKeys);

// Let's print the tool message schema if there is one
const toolSchema = ai.toolModelMessageSchema || ai.toolMessageSchema || ai.coreMessageSchema;
if (toolSchema) {
  console.log("Tool schema constructor:", toolSchema.constructor.name);
  if (toolSchema.shape) {
    console.log("Tool schema shape:", Object.keys(toolSchema.shape));
    if (toolSchema.shape.content) {
      const content = toolSchema.shape.content;
      console.log("Tool content schema type:", content.constructor.name);
      if (content._def && content._def.options) {
        console.log("Tool content options:", content._def.options.map(o => o.constructor.name));
        // let's look at array or object
        const arr = content._def.options.find(o => o instanceof z.ZodArray);
        if (arr) {
          console.log("Tool content array item type:", arr._def.type.constructor.name);
          if (arr._def.type instanceof z.ZodUnion) {
            arr._def.type._def.options.forEach((opt, idx) => {
              console.log(`Tool Option ${idx}:`, opt.constructor.name);
              if (opt instanceof z.ZodObject) {
                console.log(`  fields:`, Object.keys(opt.shape));
                for (const k of Object.keys(opt.shape)) {
                  console.log(`    ${k}:`, opt.shape[k].constructor.name);
                }
              }
            });
          } else if (arr._def.type instanceof z.ZodObject) {
            console.log(`  fields:`, Object.keys(arr._def.type.shape));
            for (const k of Object.keys(arr._def.type.shape)) {
              console.log(`    ${k}:`, arr._def.type.shape[k].constructor.name);
            }
          }
        }
      }
    }
  }
}
