import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        category: {
            type: String,
            enum: ['syllabus', 'rules', 'placement', 'exam', 'other'],
            default: 'other',
        },
        accessLevel: {
            type: String,
            enum: ['all', 'mentor_only'],
            default: 'all',
        },
        fileName: {
            type: String,
            default: '',
        },
        pageCount: {
            type: Number,
        },
        chunkCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

const Document = mongoose.model('Document', documentSchema);
export default Document;
