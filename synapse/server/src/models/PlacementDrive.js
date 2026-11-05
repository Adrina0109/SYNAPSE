import mongoose from 'mongoose';

const placementDriveSchema = new mongoose.Schema(
    {
        company: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        role: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        date: {
            type: Date,
            required: true,
        },
        minCgpa: {
            type: Number,
            min: 0,
            max: 10,
            default: 0,
        },
        maxBacklogs: {
            type: Number,
            min: 0,
            max: 20,
            default: null,
        },
        branches: {
            type: [{
                type: String,
                maxlength: 40,
            }],
            default: [],
        },
        status: {
            type: String,
            enum: ['open', 'closed'],
            default: 'open',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

placementDriveSchema.index({ date: 1, status: 1 });

const PlacementDrive = mongoose.model('PlacementDrive', placementDriveSchema);
export default PlacementDrive;
