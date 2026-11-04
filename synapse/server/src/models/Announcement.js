import mongoose from 'mongoose';

const extractedTaskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        description: {
            type: String,
            maxlength: 2000,
            default: '',
        },
        deadline: {
            type: Date,
            default: null,
        },
        category: {
            type: String,
            enum: ['assessment', 'assignment', 'placement', 'event', 'personal'],
            required: true,
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            required: true,
        },
        actionRequired: {
            type: Boolean,
            required: true,
        },
        estimatedHours: {
            type: Number,
            min: 0,
            default: 1,
        },
    },
    { _id: false }
);

const announcementSchema = new mongoose.Schema(
    {
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        rawText: {
            type: String,
            required: true,
            maxlength: 20000,
        },
        sourceType: {
            type: String,
            enum: ['official_circular', 'mentor_message', 'forwarded_message', 'other'],
            default: 'other',
        },
        extracted: {
            type: [extractedTaskSchema],
            default: [],
        },
        status: {
            type: String,
            enum: ['draft', 'confirmed'],
            default: 'draft',
        },
    },
    { timestamps: true }
);

const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;
