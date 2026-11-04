import { GoogleGenAI } from '@google/genai';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_GEMINI_EMBED_MODEL = 'gemini-embedding-2';

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
    let client;
    try {
        client = new GoogleGenAI({ apiKey });
    } catch {
        throw createAIError('AI service is unavailable. Please try again.');
    }

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

export const embedTexts = async (texts, { taskType = 'RETRIEVAL_DOCUMENT' } = {}) => {
    if (!Array.isArray(texts) || texts.some((text) => typeof text !== 'string')) {
        throw createAIError('AI could not process the document. Please try again.');
    }
    if (texts.length === 0) return [];

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        throw createAIError('AI service is not configured. Please contact an administrator.');
    }

    const model = process.env.GEMINI_EMBED_MODEL?.trim() || DEFAULT_GEMINI_EMBED_MODEL;
    const embeddings = [];

    try {
        const client = new GoogleGenAI({ apiKey });
        for (let index = 0; index < texts.length; index += 100) {
            const response = await client.models.embedContent({
                model,
                contents: texts.slice(index, index + 100),
                config: { taskType },
            });
            const batch = response.embeddings?.map((embedding) => embedding.values);
            if (
                !batch
                || batch.length !== Math.min(100, texts.length - index)
                || batch.some((values) => (
                    !Array.isArray(values)
                    || values.length === 0
                    || values.some((value) => typeof value !== 'number' || !Number.isFinite(value))
                ))
            ) {
                throw createAIError('AI returned invalid embeddings. Please try again.');
            }
            embeddings.push(...batch);
        }
    } catch {
        throw createAIError('AI service is unavailable. Please try again.');
    }

    return embeddings;
};
