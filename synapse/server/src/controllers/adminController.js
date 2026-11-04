import User from '../models/User.js';
import {
    adminIdParamsSchema,
    adminUsersQuerySchema,
    assignMentorSchema,
    unassignMentorSchema,
} from '../validators/adminValidators.js';
import { getAssignedStudentIds } from '../utils/mentorHelpers.js';

const validationErrors = (issues) => {
    const errors = {};
    issues.forEach((issue) => {
        const field = issue.path[0] ?? (issue.code === 'unrecognized_keys' ? issue.keys.join(', ') : 'general');
        errors[field] = issue.message;
    });
    return errors;
};

const respondWithValidationErrors = (res, issues) => res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: validationErrors(issues),
});

const validateAssignmentEntities = async ({ studentIds, mentorId }, res) => {
    const mentor = await User.findOne({ _id: mentorId, role: 'mentor' }).select('_id');
    if (!mentor) {
        res.status(400).json({
            success: false,
            message: 'Invalid mentor.',
            errors: { mentorId: 'The selected user is not a mentor.' },
        });
        return false;
    }

    const students = await User.find({ _id: { $in: studentIds }, role: 'student' }).select('_id').lean();
    const validStudentIds = new Set(students.map((student) => String(student._id)));
    const invalidStudentIds = studentIds.filter((studentId) => !validStudentIds.has(studentId));
    if (invalidStudentIds.length > 0) {
        res.status(400).json({
            success: false,
            message: 'Invalid students.',
            errors: { studentIds: 'Every selected user must be a student.' },
        });
        return false;
    }

    return true;
};

// GET /api/admin/users?role=student|mentor&unassigned=true
export const getUsers = async (req, res, next) => {
    try {
        const parsed = adminUsersQuerySchema.safeParse(req.query);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);

        const { role, unassigned } = parsed.data;
        const query = { role };
        if (role === 'student' && unassigned === 'true') {
            query.$or = [
                { mentors: { $exists: false } },
                { mentors: { $size: 0 } },
            ];
        }

        let usersQuery = User.find(query)
            .select('name email role department year mentors')
            .sort({ name: 1 });
        if (role === 'student') usersQuery = usersQuery.populate('mentors', 'name');

        const users = await usersQuery.lean();
        const result = users.map((user) => ({
            ...user,
            ...(role === 'student' && {
                mentors: (user.mentors || []).map((mentor) => ({
                    _id: mentor._id,
                    name: mentor.name,
                })),
            }),
        }));

        res.status(200).json({ success: true, message: 'Users retrieved successfully', users: result });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/mentors
export const getMentors = async (req, res, next) => {
    try {
        const mentors = await User.find({ role: 'mentor' })
            .select('name email role department year')
            .sort({ name: 1 })
            .lean();
        const mentorsWithCounts = await Promise.all(mentors.map(async (mentor) => ({
            ...mentor,
            assignedStudentCount: (await getAssignedStudentIds(mentor._id)).length,
        })));

        res.status(200).json({ success: true, message: 'Mentors retrieved successfully', mentors: mentorsWithCounts });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/assign
export const assignMentor = async (req, res, next) => {
    try {
        const parsed = assignMentorSchema.safeParse(req.body);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);
        if (!await validateAssignmentEntities(parsed.data, res)) return;

        const result = await User.updateMany(
            {
                _id: { $in: parsed.data.studentIds },
                role: 'student',
                mentors: { $ne: parsed.data.mentorId },
            },
            { $addToSet: { mentors: parsed.data.mentorId } }
        );

        res.status(200).json({
            success: true,
            message: 'Mentor assigned successfully',
            updatedCount: result.modifiedCount,
        });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/unassign
export const unassignMentor = async (req, res, next) => {
    try {
        const parsed = unassignMentorSchema.safeParse(req.body);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);
        if (!await validateAssignmentEntities(parsed.data, res)) return;

        const result = await User.updateMany(
            {
                _id: { $in: parsed.data.studentIds },
                role: 'student',
                mentors: parsed.data.mentorId,
            },
            { $pull: { mentors: parsed.data.mentorId } }
        );

        res.status(200).json({
            success: true,
            message: 'Mentor unassigned successfully',
            updatedCount: result.modifiedCount,
        });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res, next) => {
    try {
        const parsed = adminIdParamsSchema.safeParse(req.params);
        if (!parsed.success) return respondWithValidationErrors(res, parsed.error.errors);
        if (parsed.data.id === String(req.user.id)) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account.',
                errors: { id: 'Admins cannot delete their own account.' },
            });
        }

        const user = await User.findByIdAndDelete(parsed.data.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        next(err);
    }
};
