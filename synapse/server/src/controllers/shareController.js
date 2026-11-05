import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import ShareLink from '../models/ShareLink.js';
import { buildShareSummary } from '../services/placementService.js';

const createShareBodySchema = z.object({
    includeAcademics: z.boolean().default(false),
}).strict();

const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
const unavailableMessage = 'This link is no longer available.';

export const createShare = async (req, res, next) => {
    try {
        const parsed = createShareBodySchema.safeParse(req.body);
        if (!parsed.success) {
            const errors = {};
            parsed.error.errors.forEach((issue) => {
                errors[issue.path.join('.') || 'general'] = issue.message;
            });
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors,
            });
        }

        const now = new Date();
        await ShareLink.updateMany(
            { user: req.user.id, revokedAt: null, expiresAt: { $gt: now } },
            { $set: { revokedAt: now } }
        );

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        const shareLink = await ShareLink.create({
            user: req.user.id,
            tokenHash: tokenHash(token),
            includeAcademics: parsed.data.includeAcademics,
            expiresAt,
        });

        return res.status(201).json({
            success: true,
            message: 'Readiness link created successfully',
            share: {
                url: `/share/${token}`,
                expiresAt: shareLink.expiresAt,
                includeAcademics: shareLink.includeAcademics,
            },
        });
    } catch (error) {
        return next(error);
    }
};

export const revokeShare = async (req, res, next) => {
    try {
        const result = await ShareLink.updateMany(
            { user: req.user.id, revokedAt: null, expiresAt: { $gt: new Date() } },
            { $set: { revokedAt: new Date() } }
        );
        return res.status(200).json({
            success: true,
            message: 'Readiness links revoked successfully',
            revoked: result.modifiedCount,
        });
    } catch (error) {
        return next(error);
    }
};

export const getPublicSummary = async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const { token } = req.params;
    if (!/^[a-f0-9]{64}$/.test(token)) {
        return res.status(400).json({ success: false, message: 'Invalid share token.' });
    }

    try {
        const now = new Date();
        const link = await ShareLink.findOne({
            tokenHash: tokenHash(token),
            revokedAt: null,
            expiresAt: { $gt: now },
        }).lean();
        if (!link) {
            return res.status(404).json({ success: false, message: unavailableMessage });
        }

        const summary = await buildShareSummary(link.user, link.includeAcademics, now);
        return res.status(200).json({
            success: true,
            message: 'Readiness summary retrieved successfully',
            ...summary,
        });
    } catch (error) {
        if (error.statusCode === 404) {
            return res.status(404).json({ success: false, message: unavailableMessage });
        }
        return next(error);
    }
};
