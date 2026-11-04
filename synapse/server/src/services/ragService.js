import { PDFParse } from 'pdf-parse';
import Chunk from '../models/Chunk.js';
import Document from '../models/Document.js';
import { embedTexts } from './aiClient.js';

export const MIN_SCORE = 0.55;

const createStatusError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

export const extractText = async (buffer, mimeType) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw createStatusError(400, 'The uploaded file is empty.');
    }

    if (mimeType === 'text/plain') {
        const text = buffer.toString('utf8').trim();
        if (!text) throw createStatusError(400, 'The uploaded file contains no text.');
        return [{ page: 1, text }];
    }

    if (mimeType !== 'application/pdf') {
        throw createStatusError(400, 'Only PDF and plain text files are supported.');
    }

    const parser = new PDFParse({ data: buffer, verbosity: 0 });
    try {
        const result = await parser.getText();
        const pages = result.pages.map(({ num, text }) => ({
            page: num,
            text: text.trim(),
        }));
        if (!pages.some(({ text }) => text.length > 0)) {
            throw createStatusError(400, 'The PDF contains no extractable text. Image-only PDFs are not supported.');
        }
        return pages;
    } catch (error) {
        if (error.statusCode === 400) throw error;
        throw createStatusError(400, 'The uploaded PDF could not be read.');
    } finally {
        await parser.destroy();
    }
};

const findChunkEnd = (text, start) => {
    const limit = Math.min(start + 800, text.length);
    const minimum = Math.min(start + 480, limit);
    const content = text.slice(start, limit);
    const paragraphBreaks = [...content.matchAll(/\n\s*\n/g)];
    const paragraphEnd = paragraphBreaks.at(-1);
    if (paragraphEnd && start + paragraphEnd.index + paragraphEnd[0].length >= minimum) {
        return start + paragraphEnd.index + paragraphEnd[0].length;
    }

    const sentenceEnds = [...content.matchAll(/[.!?](?=\s|$)/g)];
    const sentenceEnd = sentenceEnds.at(-1);
    if (sentenceEnd && start + sentenceEnd.index + 1 >= minimum) {
        return start + sentenceEnd.index + 1;
    }

    const lineBreak = content.lastIndexOf('\n');
    if (lineBreak >= minimum - start) return start + lineBreak + 1;

    const whitespace = content.lastIndexOf(' ');
    if (whitespace >= minimum - start) return start + whitespace + 1;
    return limit;
};

export const chunkText = (pages) => {
    const chunks = [];
    for (const { page, text } of pages) {
        const normalizedText = text.trim();
        let start = 0;
        while (start < normalizedText.length) {
            const end = findChunkEnd(normalizedText, start);
            const chunk = normalizedText.slice(start, end).trim();
            if (chunk) chunks.push({ page, text: chunk });
            if (end >= normalizedText.length) break;
            start = Math.max(start + 1, end - 150);
        }
    }
    return chunks;
};

const cosineSimilarity = (left, right) => {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length === 0) {
        return null;
    }

    let dotProduct = 0;
    let leftMagnitude = 0;
    let rightMagnitude = 0;
    for (let index = 0; index < left.length; index += 1) {
        dotProduct += left[index] * right[index];
        leftMagnitude += left[index] ** 2;
        rightMagnitude += right[index] ** 2;
    }
    if (leftMagnitude === 0 || rightMagnitude === 0) return null;
    return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
};

export const retrieve = async (question, { role, topK = 5 } = {}) => {
    const [queryEmbedding] = await embedTexts([question], { taskType: 'RETRIEVAL_QUERY' });
    const chunks = await Chunk.find({})
        .select('text page document chunkIndex +embedding')
        .populate({
            path: 'document',
            select: 'title accessLevel',
            match: role === 'student' ? { accessLevel: 'all' } : {},
        })
        .lean();

    return chunks
        .filter((chunk) => chunk.document && Array.isArray(chunk.embedding))
        .map((chunk) => ({
            text: chunk.text,
            page: chunk.page,
            documentId: chunk.document._id,
            documentTitle: chunk.document.title,
            score: cosineSimilarity(queryEmbedding, chunk.embedding),
        }))
        .filter((chunk) => chunk.score !== null && Number.isFinite(chunk.score))
        .sort((left, right) => right.score - left.score)
        .slice(0, topK);
};

export const ingestDocument = async ({
    buffer,
    mimeType,
    title,
    category,
    accessLevel,
    fileName,
    userId,
}) => {
    const pages = await extractText(buffer, mimeType);
    const chunks = chunkText(pages);
    if (chunks.length === 0) {
        throw createStatusError(400, 'The uploaded file contains no extractable text.');
    }

    const document = await Document.create({
        title,
        uploadedBy: userId,
        category,
        accessLevel,
        fileName,
        pageCount: pages.length,
        chunkCount: chunks.length,
    });

    try {
        const embeddings = await embedTexts(chunks.map(({ text }) => text));
        await Chunk.insertMany(chunks.map((chunk, chunkIndex) => ({
            document: document._id,
            text: chunk.text,
            page: chunk.page,
            chunkIndex,
            embedding: embeddings[chunkIndex],
        })));
        return document;
    } catch (error) {
        const cleanupResults = await Promise.allSettled([
            Chunk.deleteMany({ document: document._id }),
            Document.deleteOne({ _id: document._id }),
        ]);
        const cleanupErrors = cleanupResults
            .filter((result) => result.status === 'rejected')
            .map((result) => result.reason);
        if (cleanupErrors.length > 0 && error instanceof Error) {
            error.cleanupErrors = cleanupErrors;
        }
        throw error;
    }
};
