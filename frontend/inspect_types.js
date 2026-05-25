const ai = require('ai');
const z = require('zod');

function describeZodType(schema) {
  if (!schema) return 'undefined';
  if (schema instanceof z.ZodUnion) {
    return `Union(${schema._def.options.map(describeZodType).join(' | ')})`;
  }
  if (schema instanceof z.ZodArray) {
    return `Array(${describeZodType(schema._def.type)})`;
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const props = Object.keys(shape).map(k => `${k}: ${describeZodType(shape[k])}`);
    return `Object({ ${props.join(', ')} })`;
  }
  if (schema instanceof z.ZodString) return 'string';
  if (schema instanceof z.ZodNumber) return 'number';
  if (schema instanceof z.ZodBoolean) return 'boolean';
  if (schema instanceof z.ZodLiteral) return `Literal(${JSON.stringify(schema._def.value)})`;
  if (schema instanceof z.ZodAny) return 'any';
  if (schema instanceof z.ZodUnknown) return 'unknown';
  if (schema instanceof z.ZodRecord) return 'record';
  if (schema instanceof z.ZodOptional) return `Optional(${describeZodType(schema._def.innerType)})`;
  if (schema instanceof z.ZodNullable) return `Nullable(${describeZodType(schema._def.innerType)})`;
  return schema.constructor.name || 'unknown';
}

console.log("Assistant schema shape.content:");
console.log(describeZodType(ai.assistantModelMessageSchema.shape.content));
console.log("Assistant schema shape.providerOptions:");
console.log(describeZodType(ai.assistantModelMessageSchema.shape.providerOptions));
