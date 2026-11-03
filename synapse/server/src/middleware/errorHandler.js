// Centralized error handler (must be last middleware)
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err);

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            success: false,
            message: `An account with this ${field} already exists.`,
            errors: { [field]: `An account with this ${field} already exists.` },
        });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = {};
        Object.values(err.errors).forEach((e) => {
            errors[e.path] = e.message;
        });
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Session invalid or expired. Please log in again.' });
    }

    const status = err.statusCode || err.status || 500;
    res.status(status).json({
        success: false,
        message: err.message || 'An unexpected error occurred. Please try again.',
        errors: {},
    });
};

export default errorHandler;
