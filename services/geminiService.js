const { GoogleGenAI } = require('@google/genai');

async function callWithRetry(fn, retries = 3, delayMs = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const is503 = err.message?.includes('503') ||
                     err.message?.includes('UNAVAILABLE') ||
                     err.message?.includes('overloaded');
      if (!is503 || i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
}

async function generateContent(prompt) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const result = await callWithRetry(() =>
    ai.models.generateContent({ model: 'gemini-flash-lite-latest', contents: prompt })
  );
  return result.text.trim();
}

function parseGeminiJson(raw) {
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

async function extractTopics(syllabusText) {
  const prompt = `Extract the study topics from the following syllabus text.

Return ONLY a raw JSON array. Do NOT wrap it in markdown code fences, do NOT add any explanatory text.
Each array item must be an object with exactly these fields:
- "name": the topic name (string). Use a clear, exam-ready topic title. If the syllabus has sibling bullet points that are small fragments of one bigger topic, merge them into a single coherent topic. Do NOT invent topics that are not in the syllabus.
- "subject": a short subject/category name (string). Group related topics under one subject label (e.g. if the syllabus mixes Math and Physics content, tag topics accordingly — "Algebra", "Calculus", and "Trigonometry" might all be tagged "Math"). If the syllabus covers a single subject, infer one reasonable subject name from it (e.g. "Physics") rather than defaulting everything to "General".
- "estHours": estimated hours needed, an integer between 1 and 6
- "difficulty": difficulty level, an integer between 1 and 5

Expected output structure:
[
  { "name": "...", "subject": "...", "estHours": 2, "difficulty": 3 },
  ...
]

SYLLABUS:
${syllabusText}`;

  const raw = await generateContent(prompt);

  const topics = parseGeminiJson(raw);
  return (Array.isArray(topics) ? topics : [])
    .map((t) => {
      if (!t || typeof t !== 'object') return null;
      const name = typeof t.name === 'string' ? t.name.trim() : '';
      const estHours = Number(t.estHours);
      const difficulty = Number(t.difficulty);
      return {
        name,
        subject:
          typeof t.subject === 'string' && t.subject.trim()
            ? t.subject.trim()
            : 'General',
        estHours: Number.isFinite(estHours)
          ? Math.max(1, Math.min(6, Math.round(estHours)))
          : 2,
        difficulty: Number.isFinite(difficulty)
          ? Math.max(1, Math.min(5, Math.round(difficulty)))
          : 3,
      };
    })
    .filter((t) => t && t.name);
}

async function generateQuiz(topicName, subject, difficulty) {
  const level =
    Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5 ? difficulty : 3;
  const subjectLabel = subject && String(subject).trim() ? String(subject).trim() : 'General';

  const difficultyGuidance =
    level >= 4
      ? `Difficulty ${level}/5 (advanced): ask conceptually deep questions — application, analysis, and reasoning about "${topicName}", not simple recall.`
      : level <= 2
        ? `Difficulty ${level}/5 (introductory): keep questions to basic definitions and direct recall, accessible to a beginner.`
        : `Difficulty ${level}/5 (intermediate): blend direct recall with light reasoning about "${topicName}".`;

  const prompt = `Create a short multiple-choice quiz on the study topic "${topicName}" (subject: ${subjectLabel}).

${difficultyGuidance}

Return ONLY a raw JSON array. Do NOT wrap it in markdown code fences, do NOT add any explanatory text.
The array must contain exactly 5 questions, each an object with exactly these fields:
- "question": the question text (string)
- "options": an array of exactly 4 answer choices (strings) — one correct, three plausible distractors
- "correctIndex": the index (0-3) of the correct option
- "explanation": one sentence on why the correct answer is correct

Make every question genuinely about "${topicName}"; avoid generic fill-in questions. Distractors should be realistic mistakes a student could make, not obviously silly.

Expected output structure:
[
  { "question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "..." },
  ...
]`;

  const raw = await generateContent(prompt);
  const questions = parseGeminiJson(raw);

  if (!Array.isArray(questions)) {
    throw new Error(`Failed to parse Gemini response as JSON: expected an array.\nRaw response:\n${raw}`);
  }

  return questions.map((q) => ({
    question: typeof q.question === 'string' ? q.question : '',
    options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
    correctIndex: Number.isInteger(q.correctIndex) ? q.correctIndex : 0,
    explanation: typeof q.explanation === 'string' ? q.explanation : '',
  }));
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

  if (process.argv[2] === '--quiz') {
    generateQuiz("Newton's Laws", 'Physics', 4)
      .then((questions) => {
        console.log('\nGenerated quiz:');
        console.log(JSON.stringify({ questions }, null, 2));
      })
      .catch((err) => {
        console.error('generateQuiz failed:', err.message);
        process.exit(1);
      });
    return;
  }

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

module.exports = { extractTopics, generateQuiz };