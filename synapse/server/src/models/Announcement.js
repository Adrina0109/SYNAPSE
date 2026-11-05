import mongoose from 'mongoose';

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
        audience: {
            type: String,
            enum: ['all', 'assigned'],
            required: true,
        },
        recipientMode: {
            type: String,
            enum: ['all', 'selected'],
            default: 'all',
        },
        targetMentorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            select: false,
        },
        recipientCount: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { timestamps: true }
);

const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;
