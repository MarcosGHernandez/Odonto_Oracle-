const { convertToModelMessages } = require('ai');

try {
  const m1 = [
    { role: 'user', content: 'hello' }
  ];
  console.log("M1 conversion:", convertToModelMessages(m1));
} catch (err) {
  console.error("M1 failed:", err);
}
