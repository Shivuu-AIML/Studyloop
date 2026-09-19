const { GoogleGenerativeAI } = require('@google/generative-ai');

async function extractTopics(syllabusText) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.7-flash' });

  const prompt = `Extract the study topics from the following syllabus text.

Return ONLY a raw JSON array. Do NOT wrap it in markdown code fences, do NOT add any explanatory text.
Each array item must be an object with exactly these fields:
- "name": the topic name (string)
- "estHours": estimated hours needed, an integer between 1 and 6
- "difficulty": difficulty level, an integer between 1 and 5

SYLLABUS:
${syllabusText}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Failed to parse Gemini response as JSON: ${err.message}\nRaw response:\n${raw}`
    );
  }
}

if (require.main === module) {
  require('dotenv').config();

  const sampleSyllabus = `PHYSICS SYLLABUS
1. Kinematics
2. Laws of Motion
3. Work, Energy and Power
4. Rotational Motion
5. Gravitation
6. Thermodynamics
7. Oscillations and Waves
8. Electrostatics
9. Current Electricity
10. Magnetic Effects of Current and Magnetism`;

  extractTopics(sampleSyllabus)
    .then((topics) => {
      console.log('Extracted topics:');
      console.log(JSON.stringify(topics, null, 2));
    })
    .catch((err) => {
      console.error('extractTopics failed:', err.message);
      process.exit(1);
    });
}

module.exports = { extractTopics };