import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Verifies the JWT cookie and attaches req.user
export const requireAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id };
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Session expired or invalid. Please log in again.' });
    }
};

// Role-based access control factory
export const requireRole = (...roles) => {
    return async (req, res, next) => {
        try {
            const user = await User.findById(req.user.id).select('role');
            if (!user || !roles.includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. This route requires one of: ${roles.join(', ')}.`,
                });
            }
            req.userRole = user.role;
            next();
        } catch (err) {
            next(err);
        }
    };
};
