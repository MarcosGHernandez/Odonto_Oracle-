const ai = require('ai');
const z = require('zod');

// Let's log the details of the assistantModelMessageSchema.shape.content
const contentSchema = ai.assistantModelMessageSchema.shape.content;
console.log("contentSchema options:", contentSchema._def.options.map(o => o.constructor.name));

// Let's print what the array type contains
const arraySchema = contentSchema._def.options.find(o => o instanceof z.ZodArray);
if (arraySchema) {
  const itemType = arraySchema._def.type;
  console.log("array item type:", itemType.constructor.name);
  if (itemType instanceof z.ZodUnion) {
    console.log("array item union options:");
    itemType._def.options.forEach((opt, idx) => {
      console.log(`Option ${idx}:`, opt.constructor.name);
      if (opt instanceof z.ZodObject) {
        console.log(`  fields:`, Object.keys(opt.shape));
        // print types of each field
        for (const k of Object.keys(opt.shape)) {
          console.log(`    ${k}:`, opt.shape[k].constructor.name);
        }
      }
    });
  }
}
