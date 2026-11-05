import { istDayKey } from '../utils/dateHelpers.js';

export const checkDriveEligibility = (drive, student, now = new Date()) => {
    const reasons = [];

    if (drive.status === 'closed') {
        reasons.push('This drive is closed.');
    }

    if (istDayKey(drive.date) < istDayKey(now)) {
        reasons.push('The drive date has passed.');
    }

    if (drive.minCgpa > 0) {
        if (student.cgpa === null || student.cgpa === undefined) {
            reasons.push('Add your CGPA in your profile to check eligibility.');
        } else if (student.cgpa < drive.minCgpa) {
            reasons.push(`Needs CGPA ${drive.minCgpa}, you have ${student.cgpa}.`);
        }
    }

    if (drive.maxBacklogs !== null && drive.maxBacklogs !== undefined) {
        const backlogs = student.backlogs ?? 0;
        if (backlogs > drive.maxBacklogs) {
            reasons.push(`Allows up to ${drive.maxBacklogs} backlogs, you have ${backlogs}.`);
        }
    }

    const branches = drive.branches ?? [];
    if (branches.length > 0) {
        const department = (student.department ?? '').trim().toLowerCase();
        const eligibleBranches = branches.map((branch) => branch.trim().toLowerCase());
        if (!eligibleBranches.includes(department)) {
            reasons.push(
                `Open to ${branches.join(', ')}, your department is ${student.department || 'not set'}.`
            );
        }
    }

    return { eligible: reasons.length === 0, reasons };
};
