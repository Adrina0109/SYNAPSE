import mongoose from 'mongoose';
import Task from '../models/Task.js';
import { createTaskSchema, taskQuerySchema, updateTaskSchema } from '../validators/taskValidators.js';

const validationErrors = (issues) => {
    const errors = {};
    issues.forEach((issue) => {
        const field = issue.path[0] ?? (issue.code === 'unrecognized_keys' ? issue.keys.join(', ') : 'general');
        errors[field] = issue.message;
    });
    return errors;
};

const isValidTaskId = (id) => mongoose.Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id);

const validateTaskId = (id, res) => {
    if (isValidTaskId(id)) return true;
    res.status(400).json({
        success: false,
        message: 'Invalid task ID.',
        errors: { id: 'Task ID must be a valid ObjectId.' },
    });
    return false;
};

// GET /api/tasks
export const getTasks = async (req, res, next) => {
    try {
        const parsed = taskQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors(parsed.error.errors),
            });
        }

        const filter = { user: req.user.id, ...parsed.data };
        const [withDeadline, withoutDeadline] = await Promise.all([
            Task.find({ ...filter, deadline: { $ne: null } }).sort({ deadline: 1 }),
            Task.find({ ...filter, deadline: null }),
        ]);

        res.status(200).json({
            success: true,
            message: 'Tasks retrieved successfully',
            tasks: [...withDeadline, ...withoutDeadline],
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/tasks
export const createTask = async (req, res, next) => {
    try {
        const parsed = createTaskSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors(parsed.error.errors),
            });
        }

        const task = await Task.create({
            ...parsed.data,
            user: req.user.id,
            source: 'manual',
            completedAt: parsed.data.status === 'completed' ? new Date() : null,
        });

        res.status(201).json({ success: true, message: 'Task created successfully', task });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/tasks/:id
export const updateTask = async (req, res, next) => {
    try {
        if (!validateTaskId(req.params.id, res)) return;

        const parsed = updateTaskSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors(parsed.error.errors),
            });
        }

        const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        Object.assign(task, parsed.data);
        if (parsed.data.deadline !== undefined || parsed.data.estimatedHours !== undefined) {
            task.workPlan = [];
        }
        if (parsed.data.status !== undefined) {
            task.completedAt = parsed.data.status === 'completed' ? new Date() : null;
        }
        await task.save();

        res.status(200).json({ success: true, message: 'Task updated successfully', task });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/tasks/:id/toggle
export const toggleTask = async (req, res, next) => {
    try {
        if (!validateTaskId(req.params.id, res)) return;

        const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        const wasCompleted = task.status === 'completed';
        task.status = wasCompleted ? 'pending' : 'completed';
        if (wasCompleted) task.workPlan = [];
        task.completedAt = task.status === 'completed' ? new Date() : null;
        await task.save();

        res.status(200).json({ success: true, message: 'Task status updated successfully', task });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/tasks/:id
export const deleteTask = async (req, res, next) => {
    try {
        if (!validateTaskId(req.params.id, res)) return;

        const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (err) {
        next(err);
    }
};
