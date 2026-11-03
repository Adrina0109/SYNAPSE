import User from '../models/User.js';
import { profileSchema } from '../validators/authValidators.js';

// PATCH /api/users/me/profile
export const updateProfile = async (req, res, next) => {
    try {
        const parsed = profileSchema.safeParse(req.body);
        if (!parsed.success) {
            const errors = {};
            parsed.error.errors.forEach((e) => {
                errors[e.path[0]] = e.message;
            });
            return res.status(400).json({ success: false, message: 'Validation failed', errors });
        }

        const { department, year, skills, careerGoal, dailyHours, cgpa, backlogs, targetRole, weeklyClassHours } = parsed.data;

        const updateFields = {};
        if (department !== undefined) updateFields.department = department;
        if (year !== undefined) updateFields.year = year;
        if (skills !== undefined) updateFields.skills = skills;
        if (careerGoal !== undefined) updateFields.careerGoal = careerGoal;
        if (dailyHours !== undefined) updateFields.dailyHours = dailyHours;
        if (cgpa !== undefined) updateFields.cgpa = cgpa;
        if (backlogs !== undefined) updateFields.backlogs = backlogs;
        if (targetRole !== undefined) updateFields.targetRole = targetRole;
        if (weeklyClassHours !== undefined) updateFields.weeklyClassHours = weeklyClassHours;

        // Mark onboarding complete if all required fields are present
        const user = await User.findById(req.user.id);
        const merged = { ...user.toObject(), ...updateFields };
        if (merged.department && merged.year && merged.skills.length > 0 && merged.careerGoal && merged.dailyHours) {
            updateFields.onboardingComplete = true;
        }

        const updated = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, message: 'Profile updated successfully', user: updated });
    } catch (err) {
        next(err);
    }
};
