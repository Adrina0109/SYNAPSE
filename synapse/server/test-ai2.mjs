import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });

const systemInstruction = 'You are a curriculum designer. Return exactly one JSON object {"days":[{"topic":string,"description":string,"practiceTask":string,"estimatedHours":number,"resources":[{"title":string,"type":"youtube"|"docs","query":string}]}]} and nothing else. No URLs.';
const contents = 'Goal: "Software Engineer", level beginner, 3 hours per day. Generate days 1 to 10 of 30. Return exactly 10 days with 1 to 3 resources each.';

for (let i = 1; i <= 4; i++) {
  const t = Date.now();
  try {
    const r = await client.models.generateContent({
      model, contents,
      config: { systemInstruction, responseMimeType: 'application/json' },
    });
    const secs = ((Date.now() - t) / 1000).toFixed(1);
    let days = '?';
    try { days = JSON.parse(r.text).days.length; } catch { days = 'INVALID JSON'; }
    console.log(`Call ${i}: OK in ${secs}s, days=${days}, chars=${r.text.length}`);
  } catch (e) {
    console.log(`Call ${i}: FAILED after ${((Date.now() - t) / 1000).toFixed(1)}s | status:`, e.status, '|', String(e.message).slice(0, 300));
  }
}