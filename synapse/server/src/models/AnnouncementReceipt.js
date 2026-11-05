import mongoose from 'mongoose';

const announcementReceiptSchema = new mongoose.Schema(
    {
        announcement: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Announcement',
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'dismissed'],
            default: 'pending',
        },
        confirmedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

announcementReceiptSchema.index({ announcement: 1, user: 1 }, { unique: true });

const AnnouncementReceipt = mongoose.model('AnnouncementReceipt', announcementReceiptSchema);
export default AnnouncementReceipt;
