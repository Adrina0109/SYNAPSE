import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { signupSchema, loginSchema } from '../validators/authValidators.js';

const signToken = (userId, rememberMe = false) => {
    const expiresIn = rememberMe
        ? process.env.JWT_REMEMBER_EXPIRES_IN
        : process.env.JWT_EXPIRES_IN;
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
};

const sendTokenCookie = (res, token, rememberMe = false) => {
    const maxAge = rememberMe
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 7 * 24 * 60 * 60 * 1000;  // 7 days

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge,
    });
};

// POST /api/auth/signup
export const signup = async (req, res, next) => {
    try {
        const parsed = signupSchema.safeParse(req.body);
        if (!parsed.success) {
            const errors = {};
            parsed.error.errors.forEach((e) => {
                errors[e.path[0]] = e.message;
            });
            return res.status(400).json({ success: false, message: 'Validation failed', errors });
        }

        const { name, email, password, role, inviteCode } = parsed.data;

        // Invite code check for mentor/admin
        if (role === 'mentor') {
            if (inviteCode !== process.env.MENTOR_INVITE_CODE) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid invite code for mentor role.',
                    errors: { inviteCode: 'This invite code is not valid for mentor registration.' },
                });
            }
        }
        if (role === 'admin') {
            if (inviteCode !== process.env.ADMIN_INVITE_CODE) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid invite code for admin role.',
                    errors: { inviteCode: 'This invite code is not valid for admin registration.' },
                });
            }
        }

        // Duplicate email check
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.',
                errors: { email: 'An account with this email already exists.' },
            });
        }

        const user = await User.create({
            name,
            email,
            passwordHash: password, // pre-save hook will hash it
            role,
        });

        const token = signToken(user._id);
        sendTokenCookie(res, token);

        res.status(201).json({ success: true, message: 'Account created successfully', user });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: { general: 'Invalid email or password.' },
            });
        }

        const { email, password, rememberMe } = parsed.data;

        // Always select passwordHash for comparison
        const user = await User.findOne({ email }).select('+passwordHash');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.',
                errors: { general: 'Invalid email or password.' },
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.',
                errors: { general: 'Invalid email or password.' },
            });
        }

        const token = signToken(user._id, rememberMe);
        sendTokenCookie(res, token, rememberMe);

        // Return user without passwordHash
        const userObj = user.toJSON();
        res.status(200).json({ success: true, message: 'Logged in successfully', user: userObj });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/logout
export const logout = (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// GET /api/auth/me
export const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.status(200).json({ success: true, user });
    } catch (err) {
        next(err);
    }
};
