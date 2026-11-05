import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            maxlength: 150,
        },
        url: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: ['youtube', 'docs', 'course', 'book'],
        },
    },
    { _id: false }
);

const notesSchema = new mongoose.Schema(
    {
        summary: String,
        keyPoints: [String],
        example: String,
        commonMistakes: [String],
        quickRecap: String,
        generatedAt: Date,
    },
    { _id: false }
);

const certificationSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ['none', 'matched', 'not_found', 'unverified'],
            default: 'none',
        },
        catalogId: String,
        name: String,
        provider: String,
        costType: String,
        costNote: String,
        url: String,
        lastVerified: String,
        message: String,
    },
    { _id: false }
);

const daySchema = new mongoose.Schema(
    {
        dayNumber: {
            type: Number,
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        topic: {
            type: String,
            required: true,
            maxlength: 200,
        },
        description: {
            type: String,
            maxlength: 800,
            default: '',
        },
        resources: {
            type: [resourceSchema],
            default: [],
        },
        practiceTask: {
            type: String,
            maxlength: 500,
            default: '',
        },
        estimatedHours: {
            type: Number,
            min: 0,
        },
        completed: {
            type: Boolean,
            default: false,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        notes: {
            type: notesSchema,
            default: null,
        },
    },
    { _id: false }
);

const roadmapSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        goal: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        currentLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            required: true,
        },
        hoursPerDay: {
            type: Number,
            min: 0.5,
            max: 8,
            required: true,
        },
        durationDays: {
            type: Number,
            min: 3,
            max: 60,
            required: true,
        },
        preferredResources: {
            type: [String],
            enum: ['youtube', 'docs', 'course', 'book', 'notes'],
            required: true,
        },
        pathType: {
            type: String,
            enum: ['free_learning', 'free_certificate', 'any_certificate'],
            default: 'free_learning',
        },
        targetCertification: {
            type: String,
            maxlength: 150,
            default: '',
        },
        certification: {
            type: certificationSchema,
            default: () => ({ status: 'none' }),
        },
        status: {
            type: String,
            enum: ['active', 'paused', 'completed'],
            default: 'active',
        },
        startDate: {
            type: Date,
            required: true,
        },
        days: {
            type: [daySchema],
            default: [],
        },
    },
    { timestamps: true }
);

roadmapSchema.index({ user: 1, status: 1 });

const Roadmap = mongoose.model('Roadmap', roadmapSchema);
export default Roadmap;
