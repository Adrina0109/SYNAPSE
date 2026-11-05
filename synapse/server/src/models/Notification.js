import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
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
        readAt: {
            type: Date,
            default: null,
        },
        dismissedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

notificationSchema.index({ announcement: 1, user: 1 }, { unique: true });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
