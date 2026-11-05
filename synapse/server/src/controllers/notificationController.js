import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id);

export const getNotifications = async (req, res, next) => {
    try {
        const filter = { user: req.user.id, dismissedAt: null };
        const [notifications, unreadCount] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .limit(30)
                .select('_id announcement readAt createdAt')
                .populate({ path: 'announcement', select: 'rawText createdAt' })
                .lean(),
            Notification.countDocuments({ ...filter, readAt: null }),
        ]);

        res.status(200).json({
            success: true,
            unreadCount,
            notifications: notifications
                .filter(({ announcement }) => announcement)
                .map((notification) => ({
                    id: notification._id,
                    announcementId: notification.announcement._id,
                    text: notification.announcement.rawText.slice(0, 200),
                    createdAt: notification.announcement.createdAt,
                    readAt: notification.readAt,
                })),
        });
    } catch (err) {
        next(err);
    }
};

export const markNotificationRead = async (req, res, next) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { $set: { readAt: new Date() } },
            { new: true, select: '_id readAt' }
        ).lean();
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found.' });
        }

        res.status(200).json({
            success: true,
            notification: { id: notification._id, readAt: notification.readAt },
        });
    } catch (err) {
        next(err);
    }
};
