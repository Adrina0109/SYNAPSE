import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';
console.log('Model:', model, '| key set:', Boolean(process.env.GEMINI_API_KEY));
try {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
  const r = await client.models.generateContent({
    model,
    contents: 'Return {"ok":true}',
    config: { responseMimeType: 'application/json' },
  });
  console.log('SUCCESS:', r.text);
} catch (e) {
  console.log('FAILED status:', e.status, '\nMessage:', e.message);
}