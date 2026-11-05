import mongoose from 'mongoose';

const workPlanEntrySchema = new mongoose.Schema(
    {
        date: { type: Date, required: true },
        hours: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const taskSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        description: {
            type: String,
            maxlength: 2000,
            default: '',
        },
        category: {
            type: String,
            enum: ['assessment', 'assignment', 'placement', 'event', 'personal'],
            default: 'personal',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed'],
            default: 'pending',
        },
        deadline: {
            type: Date,
            default: null,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        source: {
            type: String,
            enum: ['manual', 'announcement', 'mentor'],
            default: 'manual',
        },
        announcement: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Announcement',
            default: null,
        },
        estimatedHours: {
            type: Number,
            min: 0,
            default: 1,
        },
        // Planner-saved schedule of when the student works on this task; empty means "use the default spread".
        workPlan: {
            type: [workPlanEntrySchema],
            default: [],
        },
    },
    { timestamps: true }
);

taskSchema.index({ user: 1, deadline: 1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;
