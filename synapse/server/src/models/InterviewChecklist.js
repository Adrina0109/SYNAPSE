import mongoose from 'mongoose';

const tickSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
        },
        tickedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const mockSessionSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    notes: {
        type: String,
        maxlength: 500,
        default: '',
    },
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const interviewChecklistSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        ticks: {
            type: [tickSchema],
            default: [],
        },
        mockSessions: {
            type: [mockSessionSchema],
            default: [],
        },
    },
    { timestamps: true }
);

const InterviewChecklist = mongoose.model('InterviewChecklist', interviewChecklistSchema);
export default InterviewChecklist;
