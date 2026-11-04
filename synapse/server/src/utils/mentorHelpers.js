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

export const isAssigned = async (mentorId, studentId) => {
    if (!isValidObjectId(mentorId) || !isValidObjectId(studentId)) return false;

    const actor = await User.findById(mentorId).select('role').lean();
    if (!actor) return false;

    const query = actor.role === 'admin'
        ? { _id: studentId, role: 'student' }
        : { _id: studentId, role: 'student', mentors: mentorId };
    return Boolean(await User.exists(query));
};
