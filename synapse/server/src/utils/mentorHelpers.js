import mongoose from 'mongoose';
import User from '../models/User.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(String(id));

export const getAssignedStudentIds = async (mentorId) => {
    if (!isValidObjectId(mentorId)) return [];

    const actor = await User.findById(mentorId).select('role').lean();
    if (!actor) return [];

    const query = actor.role === 'admin'
        ? { role: 'student' }
        : { role: 'student', mentors: mentorId };
    const students = await User.find(query).select('_id').lean();
    return students.map((student) => student._id);
};

export const resolveRecipientStudentIds = async (actorId, role, recipientMode, requestedStudentIds = []) => {
    const assignedStudentIds = await getAssignedStudentIds(actorId);
    const assignedSet = new Set(assignedStudentIds.map(String));
    if (recipientMode === 'all') {
        if (assignedStudentIds.length === 0) {
            const error = new Error('No students are available to receive this message.');
            error.statusCode = 400;
            throw error;
        }
        return assignedStudentIds;
    }

    const uniqueRequestedIds = [...new Set(requestedStudentIds.map(String))];
    if (role === 'mentor' && uniqueRequestedIds.some((id) => !assignedSet.has(id))) {
        const error = new Error('One or more selected students are not assigned to you.');
        error.statusCode = 403;
        throw error;
    }

    if (role === 'admin' && uniqueRequestedIds.some((id) => !assignedSet.has(id))) {
        const error = new Error('One or more selected IDs do not identify a student.');
        error.statusCode = 400;
        throw error;
    }

    const assignedById = new Map(assignedStudentIds.map((studentId) => [String(studentId), studentId]));
    const recipients = uniqueRequestedIds
        .map((id) => assignedById.get(id))
        .filter(Boolean);
    if (recipients.length === 0) {
        const error = new Error('Select at least one student to receive this message.');
        error.statusCode = 400;
        throw error;
    }
    return recipients;
};

export const getAssignedStudents = async (actorId) => {
    const studentIds = await getAssignedStudentIds(actorId);
    if (studentIds.length === 0) return [];

    return User.find({
        _id: { $in: studentIds },
        role: 'student',
    })
        .select('_id name email department year')
        .sort({ name: 1 })
        .lean();
};

export const isAssigned = async (mentorId, studentId) => {
    if (!isValidObjectId(mentorId) || !isValidObjectId(studentId)) return false;

    const actor = await User.findById(mentorId).select('role').lean();
    if (!actor) return false;

    const query = actor.role === 'admin'
        ? { _id: studentId, role: 'student' }
        : { _id: studentId, role: 'student', mentors: mentorId };
    return Boolean(await User.exists(query));
};
