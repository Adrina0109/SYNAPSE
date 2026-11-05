import mongoose from 'mongoose';

const breakdownSchema = new mongoose.Schema(
    {
        factor: {
            type: String,
            required: true,
        },
        value: {
            type: Number,
            required: true,
        },
        contribution: {
            type: Number,
            required: true,
        },
    },
    { _id: false }
);

const readinessSnapshotSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    weekKey: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
    },
    score: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    breakdown: {
        type: [breakdownSchema],
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

readinessSnapshotSchema.index({ user: 1, weekKey: 1 }, { unique: true });

const ReadinessSnapshot = mongoose.model('ReadinessSnapshot', readinessSnapshotSchema);
export default ReadinessSnapshot;
