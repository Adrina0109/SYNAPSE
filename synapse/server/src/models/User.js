import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
            select: false,
        },
        role: {
            type: String,
            enum: ['student', 'mentor', 'admin'],
            default: 'student',
        },
        department: {
            type: String,
            default: '',
        },
        year: {
            type: Number,
            min: 1,
            max: 5,
            default: null,
        },
        skills: {
            type: [String],
            default: [],
        },
        careerGoal: {
            type: String,
            default: '',
        },
        dailyHours: {
            type: Number,
            min: 1,
            max: 8,
            default: null,
        },
        onboardingComplete: {
            type: Boolean,
            default: false,
        },
                mentor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        cgpa: {
            type: Number,
            min: 0,
            max: 10,
            default: null,
        },
        backlogs: {
            type: Number,
            min: 0,
            default: 0,
        },
        targetRole: {
            type: String,
            default: '',
        },
        weeklyClassHours: {
            type: Number,
            min: 0,
            max: 60,
            default: 30,
        },
    },
    { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next();
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    next();
});

// Compare candidate password
userSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.passwordHash);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    delete obj.__v;
    return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
