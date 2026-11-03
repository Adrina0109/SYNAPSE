import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const STUDENTS = [
    { name: 'Aarav Sharma', email: 'aarav@demo.com', department: 'Computer Science', year: 3, skills: ['Python', 'Machine Learning', 'SQL'], careerGoal: 'Data Scientist', dailyHours: 3 },
    { name: 'Priya Nair', email: 'priya@demo.com', department: 'Electronics & Communication', year: 2, skills: ['C++', 'Embedded Systems', 'MATLAB'], careerGoal: 'Hardware Engineer', dailyHours: 2 },
    { name: 'Rohan Mehta', email: 'rohan@demo.com', department: 'Computer Science', year: 4, skills: ['React', 'Node.js', 'MongoDB'], careerGoal: 'Full-Stack Developer', dailyHours: 4 },
    { name: 'Sneha Patel', email: 'sneha@demo.com', department: 'Information Technology', year: 3, skills: ['Java', 'Spring Boot', 'MySQL'], careerGoal: 'Backend Engineer', dailyHours: 3 },
    { name: 'Arjun Reddy', email: 'arjun@demo.com', department: 'Computer Science', year: 2, skills: ['Python', 'Django', 'PostgreSQL'], careerGoal: 'Software Engineer', dailyHours: 2 },
    { name: 'Kavya Krishnan', email: 'kavya@demo.com', department: 'Civil Engineering', year: 4, skills: ['AutoCAD', 'STAAD Pro', 'Project Management'], careerGoal: 'Structural Engineer', dailyHours: 2 },
    { name: 'Vikram Singh', email: 'vikram@demo.com', department: 'Mechanical Engineering', year: 3, skills: ['SolidWorks', 'ANSYS', 'Manufacturing'], careerGoal: 'Product Engineer', dailyHours: 3 },
    { name: 'Tanvi Joshi', email: 'tanvi@demo.com', department: 'Computer Science', year: 1, skills: ['HTML', 'CSS', 'JavaScript'], careerGoal: 'UI/UX Designer', dailyHours: 2 },
    { name: 'Manish Gupta', email: 'manish@demo.com', department: 'Information Technology', year: 4, skills: ['DevOps', 'Docker', 'Kubernetes', 'AWS'], careerGoal: 'DevOps Engineer', dailyHours: 4 },
    { name: 'Divya Iyer', email: 'divya@demo.com', department: 'Computer Science', year: 3, skills: ['Flutter', 'Dart', 'Firebase'], careerGoal: 'Mobile Developer', dailyHours: 3 },
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
    await User.deleteMany({});
    console.log('🗑  Cleared existing users');

    const hash = async (pw) => bcrypt.hash(pw, 12);

    // Create admin
    await User.create({
        name: ADMIN.name,
        email: ADMIN.email,
        passwordHash: await hash('Admin@Synapse1!'),
        role: 'admin',
        department: ADMIN.department,
        onboardingComplete: true,
    });
    console.log('✅ Admin created: admin@synapse.dev / Admin@Synapse1!');

    // Create mentors
    for (const m of MENTORS) {
        await User.create({
            name: m.name,
            email: m.email,
            passwordHash: await hash('Mentor@Synapse1!'),
            role: 'mentor',
            department: m.department,
            skills: m.skills,
            onboardingComplete: true,
        });
    }
    console.log('✅ 2 mentors created (password: Mentor@Synapse1!)');

    // Create students
    for (const s of STUDENTS) {
        await User.create({
            name: s.name,
            email: s.email,
            passwordHash: await hash('Student@Synapse1!'),
            role: 'student',
            department: s.department,
            year: s.year,
            skills: s.skills,
            careerGoal: s.careerGoal,
            dailyHours: s.dailyHours,
            onboardingComplete: true,
        });
    }
    console.log('✅ 10 students created (password: Student@Synapse1!)');

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
