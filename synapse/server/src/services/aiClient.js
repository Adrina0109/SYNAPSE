import { GoogleGenAI } from '@google/genai';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_GEMINI_EMBED_MODEL = 'gemini-embedding-2';

const RETRYABLE_STATUSES = new Set([429, 500, 503, 504]);
const RETRY_DELAYS_MS = [2000, 4000, 8000, 12000];
const sensitiveValues = new Map();
const STATUS_BY_CODE = {
    RESOURCE_EXHAUSTED: 429,
    INTERNAL: 500,
    UNAVAILABLE: 503,
    DEADLINE_EXCEEDED: 504,
    NOT_FOUND: 404,
    UNAUTHENTICATED: 401,
    PERMISSION_DENIED: 403,
};

const createAIError = (message, statusCode = 502) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getErrorStatus = (error) => {
    const candidates = [error?.status, error?.code, error?.response?.status];
    for (const candidate of candidates) {
        const numeric = Number(candidate);
        if (Number.isInteger(numeric) && numeric >= 100 && numeric <= 599) {
            return numeric;
        }
        const mapped = STATUS_BY_CODE[String(candidate).toUpperCase()];
        if (mapped) return mapped;
    }
    return undefined;
};

const safeLogValue = (value) => {
    let safeValue = String(value ?? 'unknown');
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey) safeValue = safeValue.split(apiKey).join('[REDACTED]');
    return safeValue
        .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
        .replace(/[\r\n\t]+/g, ' ')
        .slice(0, 120);
};

const getSafeErrorMessage = (error) => {
    let message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey) message = message.split(apiKey).join('[REDACTED]');
    for (const value of sensitiveValues.keys()) {
        if (value) message = message.split(value).join('[REDACTED]');
    }
    return message
        .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
        .replace(/(?:key=|x-goog-api-key[:=]\s*)[^\s&]+/gi, '[REDACTED]')
        .replace(/[\r\n\t]+/g, ' ')
        .slice(0, 300);
};

const logAIError = (context, error) => {
    const status = getErrorStatus(error) ?? error?.code ?? 'unknown';
    console.error(`[AI] ${safeLogValue(context)} ${safeLogValue(status)} ${getSafeErrorMessage(error)}`);
};

const getRetryDelayMs = (error, retryIndex) => {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const delayMatch = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i)
        || message.match(/\bretry\s+in\s+(\d+(?:\.\d+)?)s\b/i);
    if (delayMatch) return Math.min(Number(delayMatch[1]) * 1000, 20000);
    return RETRY_DELAYS_MS[Math.min(retryIndex, RETRY_DELAYS_MS.length - 1)];
};

const withRetry = async (fn, { retries = 4, model = 'unknown' } = {}) => {
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await fn();
        } catch (error) {
            const status = getErrorStatus(error);
            if (!RETRYABLE_STATUSES.has(status) || attempt >= retries) throw error;

            const waitMs = Math.min(20000, getRetryDelayMs(error, attempt) + Math.random() * 500);
            const waitSeconds = (waitMs / 1000).toFixed(waitMs % 1000 === 0 ? 0 : 1);
            console.error(`[AI] ${status} from ${safeLogValue(model)}, retry ${attempt + 1}/${retries} in ${waitSeconds}s`);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
    }
};

const isRetryableError = (error) => RETRYABLE_STATUSES.has(getErrorStatus(error));

const mapAIError = (error, model, allowOverload = false) => {
    const status = getErrorStatus(error);
    const message = error instanceof Error ? error.message : String(error ?? '');

    if (status === 429) {
        return createAIError('The AI is busy right now (usage limit reached). Please wait a minute and try again.', 429);
    }
    if (
        status === 404
        || /\bmodel\b.{0,80}\bnot found\b|\bnot found\b.{0,80}\bmodel\b/i.test(message)
    ) {
        console.error(`[AI] Model not available: ${safeLogValue(model)}`);
        return createAIError('AI model is not available. Please contact an administrator.');
    }
    if (
        status === 401
        || status === 403
        || /api[\s_-]?key|invalid key|key not valid/i.test(message)
    ) {
        return createAIError('AI service is not configured correctly. Please contact an administrator.');
    }
    if (allowOverload && [500, 503, 504].includes(status)) {
        return createAIError('The AI is overloaded right now. Please try again in a minute.', 503);
    }
    return createAIError('AI service is unavailable. Please try again.');
};

const callWithFallback = async ({ model, fallbackModel, context, request }) => {
    try {
        return await withRetry(() => request(model), { retries: 4, model });
    } catch (primaryError) {
        logAIError(`${context} model=${model}`, primaryError);
        if (isRetryableError(primaryError) && fallbackModel && fallbackModel !== model) {
            try {
                return await withRetry(
                    () => request(fallbackModel),
                    { retries: 0, model: fallbackModel }
                );
            } catch (fallbackError) {
                logAIError(`${context} fallback_model=${fallbackModel}`, fallbackError);
                throw mapAIError(fallbackError, fallbackModel, true);
            }
        }
        throw mapAIError(primaryError, model, true);
    }
};

const createClient = (apiKey, model) => {
    try {
        return new GoogleGenAI({ apiKey });
    } catch (error) {
        logAIError('AI client initialization', error);
        throw mapAIError(error, model);
    }
};

const addSensitiveValues = (values) => {
    const activeValues = [...new Set(values.filter((value) => typeof value === 'string' && value))];
    activeValues.forEach((value) => {
        sensitiveValues.set(value, (sensitiveValues.get(value) ?? 0) + 1);
    });
    return () => {
        activeValues.forEach((value) => {
            const count = sensitiveValues.get(value);
            if (count === 1) sensitiveValues.delete(value);
            else sensitiveValues.set(value, count - 1);
        });
    };
};

export const generateJSON = async ({ systemPrompt, userPrompt }) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        throw createAIError('AI service is not configured correctly. Please contact an administrator.');
    }

    const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
    const fallbackModel = process.env.GEMINI_FALLBACK_MODEL?.trim();
    const client = createClient(apiKey, model);
    const generate = (selectedModel) => client.models.generateContent({
        model: selectedModel,
        contents: userPrompt,
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
        },
    });
    const request = () => callWithFallback({
        model,
        fallbackModel,
        context: 'generateContent',
        request: generate,
    });

    const removeSensitiveValues = addSensitiveValues([systemPrompt, userPrompt]);
    try {
        let response = await request();
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

            response = await request();
        }
        throw createAIError('AI returned invalid JSON. Please try again.');
    } finally {
        removeSensitiveValues();
    }
};

export const embedTexts = async (texts, { taskType = 'RETRIEVAL_DOCUMENT' } = {}) => {
    if (!Array.isArray(texts) || texts.some((text) => typeof text !== 'string')) {
        throw createAIError('AI could not process the document. Please try again.');
    }
    if (texts.length === 0) return [];

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        throw createAIError('AI service is not configured correctly. Please contact an administrator.');
    }

    const model = process.env.GEMINI_EMBED_MODEL?.trim() || DEFAULT_GEMINI_EMBED_MODEL;
    const fallbackModel = process.env.GEMINI_FALLBACK_MODEL?.trim();
    const client = createClient(apiKey, model);
    const embeddings = [];

    const removeSensitiveValues = addSensitiveValues(texts);
    try {
        for (let index = 0; index < texts.length; index += 100) {
            const batchSize = Math.min(100, texts.length - index);
            const response = await callWithFallback({
                model,
                fallbackModel,
                context: 'embedContent',
                request: (selectedModel) => client.models.embedContent({
                    model: selectedModel,
                    contents: texts.slice(index, index + 100),
                    config: { taskType },
                }),
            });
            const batch = response.embeddings?.map((embedding) => embedding.values);
            if (
                !batch
                || batch.length !== batchSize
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
    } finally {
        removeSensitiveValues();
    }

    return embeddings;
};
