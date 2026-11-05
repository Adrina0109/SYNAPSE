import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Announcement from '../models/Announcement.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

const STUDENTS = [
    { name: 'Aarav Sharma', email: 'aarav@demo.com', department: 'Computer Science', year: 3, skills: ['Python', 'Machine Learning', 'SQL'], careerGoal: 'Data Scientist', dailyHours: 3, cgpa: 8.6, backlogs: 0, weeklyClassHours: 26 },
    { name: 'Priya Nair', email: 'priya@demo.com', department: 'Electronics & Communication', year: 2, skills: ['C++', 'Embedded Systems', 'MATLAB'], careerGoal: 'Hardware Engineer', dailyHours: 2, cgpa: 7.8, backlogs: 0, weeklyClassHours: 30 },
    { name: 'Rohan Mehta', email: 'rohan@demo.com', department: 'Computer Science', year: 4, skills: ['React', 'Node.js', 'MongoDB'], careerGoal: 'Full-Stack Developer', dailyHours: 4, cgpa: 9.2, backlogs: 0, weeklyClassHours: 22 },
    { name: 'Sneha Patel', email: 'sneha@demo.com', department: 'Information Technology', year: 3, skills: ['Java', 'Spring Boot', 'MySQL'], careerGoal: 'Backend Engineer', dailyHours: 3, cgpa: 8.1, backlogs: 0, weeklyClassHours: 28 },
    { name: 'Arjun Reddy', email: 'arjun@demo.com', department: 'Computer Science', year: 2, skills: ['Python', 'Django', 'PostgreSQL'], careerGoal: 'Software Engineer', dailyHours: 2, cgpa: 6.8, backlogs: 1, weeklyClassHours: 32 },
    { name: 'Kavya Krishnan', email: 'kavya@demo.com', department: 'Civil Engineering', year: 4, skills: ['AutoCAD', 'STAAD Pro', 'Project Management'], careerGoal: 'Structural Engineer', dailyHours: 2, cgpa: 7.4, backlogs: 0, weeklyClassHours: 24 },
    { name: 'Vikram Singh', email: 'vikram@demo.com', department: 'Mechanical Engineering', year: 3, skills: ['SolidWorks', 'ANSYS', 'Manufacturing'], careerGoal: 'Product Engineer', dailyHours: 3, cgpa: 8.3, backlogs: 0, weeklyClassHours: 27 },
    { name: 'Tanvi Joshi', email: 'tanvi@demo.com', department: 'Computer Science', year: 1, skills: ['HTML', 'CSS', 'JavaScript'], careerGoal: 'UI/UX Designer', dailyHours: 2, cgpa: 9.4, backlogs: 0, weeklyClassHours: 31 },
    { name: 'Manish Gupta', email: 'manish@demo.com', department: 'Information Technology', year: 4, skills: ['DevOps', 'Docker', 'Kubernetes', 'AWS'], careerGoal: 'DevOps Engineer', dailyHours: 4, cgpa: 7.1, backlogs: 2, weeklyClassHours: 23 },
    { name: 'Divya Iyer', email: 'divya@demo.com', department: 'Computer Science', year: 3, skills: ['Flutter', 'Dart', 'Firebase'], careerGoal: 'Mobile Developer', dailyHours: 3, cgpa: 8.9, backlogs: 0, weeklyClassHours: 25 },
];

const MENTORS = [
    { name: 'Dr. Suresh Babu', email: 'suresh@demo.com', department: 'Computer Science', skills: ['Algorithms', 'System Design', 'Mentoring'] },
    { name: 'Prof. Anita Desai', email: 'anita@demo.com', department: 'Information Technology', skills: ['Web Development', 'Cloud Computing', 'Agile'] },
];

const ADMIN = {
    name: 'Admin SYNAPSE',
    email: 'admin@synapse.dev',
    department: 'Administration',
};

async function seed() {
    await connectDB();
    console.log('🌱 Starting seed...');

    // Clear existing data
    await Task.deleteMany({});
    await Announcement.deleteMany({});
    await User.deleteMany({});
    console.log('🗑  Cleared existing users');

    // Create admin
    await User.create({
        name: ADMIN.name,
        email: ADMIN.email,
        passwordHash: 'Admin@Synapse1!',
        role: 'admin',
        department: ADMIN.department,
        onboardingComplete: true,
    });
    console.log('✅ Admin created: admin@synapse.dev / Admin@Synapse1!');

    // Create mentors
    const mentors = [];
    for (const m of MENTORS) {
        mentors.push(await User.create({
            name: m.name,
            email: m.email,
            passwordHash: 'Mentor@Synapse1!',
            role: 'mentor',
            department: m.department,
            skills: m.skills,
            onboardingComplete: true,
        }));
    }
    const [mentor1, mentor2] = mentors;
    console.log('✅ 2 mentors created (password: Mentor@Synapse1!)');

    // Create students
    for (const [index, s] of STUDENTS.entries()) {
        await User.create({
            name: s.name,
            email: s.email,
            passwordHash: 'Student@Synapse1!',
            role: 'student',
            department: s.department,
            year: s.year,
            skills: s.skills,
            careerGoal: s.careerGoal,
            dailyHours: s.dailyHours,
            cgpa: s.cgpa,
            backlogs: s.backlogs,
            targetRole: s.careerGoal,
            weeklyClassHours: s.weeklyClassHours,
            mentors: index < 5
                ? (index === 0 ? [mentor1._id, mentor2._id] : [mentor1._id])
                : [mentor2._id],
            onboardingComplete: true,
        });
    }
    console.log('✅ 10 students created (password: Student@Synapse1!)');
    console.log('✅ Mentor assignments: suresh@demo.com → 5 students; anita@demo.com → 6 students');

    console.log('\n🌐 Seed complete! Demo accounts:');
    console.log('   Admin   → admin@synapse.dev       / Admin@Synapse1!');
    console.log('   Mentor  → suresh@demo.com         / Mentor@Synapse1!');
    console.log('   Mentor  → anita@demo.com          / Mentor@Synapse1!');
    console.log('   Student → aarav@demo.com          / Student@Synapse1!');
    console.log('   (+ 9 more students, same password)');

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
