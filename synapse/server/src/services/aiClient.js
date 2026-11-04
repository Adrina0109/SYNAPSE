import { GoogleGenAI } from '@google/genai';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

const createAIError = (message) => {
    const error = new Error(message);
    error.statusCode = 502;
    return error;
};

export const generateJSON = async ({ systemPrompt, userPrompt }) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        throw createAIError('AI service is not configured. Please contact an administrator.');
    }

    const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
    const client = new GoogleGenAI({ apiKey });

    let response;
    try {
        response = await client.models.generateContent({
            model,
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
            },
        });
    } catch {
        throw createAIError('AI service is unavailable. Please try again.');
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            if (typeof response.text !== 'string' || response.text.trim() === '') {
                throw new SyntaxError('Empty JSON response');
            }
            return JSON.parse(response.text);
        } catch (error) {
            if (!(error instanceof SyntaxError)) {
                throw createAIError('AI returned an invalid response. Please try again.');
            }
            if (attempt === 1) {
                throw createAIError('AI returned invalid JSON. Please try again.');
            }
        }

        try {
            response = await client.models.generateContent({
                model,
                contents: userPrompt,
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: 'application/json',
                },
            });
        } catch {
            throw createAIError('AI service is unavailable. Please try again.');
        }
    }

    throw createAIError('AI returned invalid JSON. Please try again.');
};
