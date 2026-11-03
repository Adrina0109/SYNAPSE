import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';
import { onboardingDetailsSchema } from '../lib/validators.js';

const DEPARTMENTS = [
    'Computer Science', 'Information Technology', 'Electronics & Communication',
    'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering',
    'Chemical Engineering', 'Biotechnology', 'Physics', 'Mathematics', 'Other',
];

const CAREER_GOALS = [
    'Software Engineer', 'Data Scientist', 'Machine Learning Engineer',
    'Full-Stack Developer', 'Backend Engineer', 'Frontend Developer',
    'DevOps / SRE', 'Mobile Developer', 'UI/UX Designer', 'Product Manager',
    'Researcher / PhD', 'Entrepreneur', 'Hardware Engineer', 'Other',
];

const SKILL_SUGGESTIONS = [
    'Python', 'JavaScript', 'Java', 'C++', 'C', 'React', 'Node.js', 'SQL',
    'Machine Learning', 'Data Structures', 'Algorithms', 'System Design',
    'Docker', 'AWS', 'MongoDB', 'PostgreSQL', 'Flutter', 'Dart', 'MATLAB',
    'HTML', 'CSS', 'Spring Boot', 'Django', 'Flask', 'TypeScript',
];

export default function Onboarding() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        formState: { errors: detailErrors },
    } = useForm({
        resolver: zodResolver(onboardingDetailsSchema),
        mode: 'onBlur',
    });

    const [form, setForm] = useState({
        department: '',
        year: 2,
        skills: [],
        careerGoal: '',
        careerGoalCustom: '',
        dailyHours: 3,
    });
    const [skillInput, setSkillInput] = useState('');
    const [filteredSuggestions, setFilteredSuggestions] = useState([]);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState('');

    const handleSkillInput = (val) => {
        setSkillInput(val);
        if (val.length > 0) {
            setFilteredSuggestions(
                SKILL_SUGGESTIONS.filter(
                    (s) => s.toLowerCase().includes(val.toLowerCase()) && !form.skills.includes(s)
                ).slice(0, 6)
            );
        } else {
            setFilteredSuggestions([]);
        }
    };

    const addSkill = (skill) => {
        if (!form.skills.includes(skill) && skill.trim()) {
            setForm((f) => ({ ...f, skills: [...f.skills, skill.trim()] }));
        }
        setSkillInput('');
        setFilteredSuggestions([]);
    };

    const removeSkill = (skill) => {
        setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));
    };

    const handleSkillKeyDown = (e) => {
        if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
            e.preventDefault();
            addSkill(skillInput.trim());
        }
    };

    const validate = () => {
        const errs = {};
        if (!form.department) errs.department = 'Select your department';
        if (!form.year) errs.year = 'Select your year';
        if (form.skills.length === 0) errs.skills = 'Add at least one skill';
        if (!form.careerGoal) errs.careerGoal = 'Select a career goal';
        if (form.careerGoal === 'Other' && !form.careerGoalCustom.trim()) {
            errs.careerGoalCustom = 'Describe your career goal';
        }
        return errs;
    };

    const onSubmit = async (details) => {
        const errs = validate();
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setIsLoading(true);
        setServerError('');
        try {
            const payload = {
                department: form.department,
                year: form.year,
                skills: form.skills,
                careerGoal: form.careerGoal === 'Other' ? form.careerGoalCustom : form.careerGoal,
                dailyHours: form.dailyHours,
                ...details,
            };
            const { data } = await api.patch('/users/me/profile', payload);
            if (data.success) {
                updateUser(data.user);
                navigate('/student');
            }
        } catch (err) {
            setServerError(err.response?.data?.message || 'Something went wrong.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-paper">
            <div className="max-w-2xl mx-auto px-6 py-16">
                {/* Header */}
                <div className="mb-12">
                    <span className="font-mono text-xs tracking-widest uppercase text-signal">Step 2 of 2</span>
                    <h1 className="font-display text-4xl font-bold text-ink mt-2 mb-3">
                        Tell us about you, {user?.name?.split(' ')[0]}.
                    </h1>
                    <p className="font-body text-ink-muted text-base">
                        This shapes your roadmap, surfaces the right tasks, and helps mentors understand where you're headed.
                    </p>
                </div>

                {serverError && (
                    <div className="mb-8 px-4 py-3 bg-signal/10 border border-signal/30 text-signal font-body text-sm" role="alert">
                        {serverError}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
                    {/* Department */}
                    <div>
                        <label htmlFor="department" className="block font-body text-sm font-medium text-ink mb-2">
                            Department
                        </label>
                        <select
                            id="department"
                            value={form.department}
                            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                            className="input-base"
                            aria-invalid={!!errors.department}
                        >
                            <option value="">Select your department</option>
                            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                        </select>
                        {errors.department && <p className="mt-1 font-mono text-xs text-signal">{errors.department}</p>}
                    </div>

                    {/* Year */}
                    <div>
                        <label className="block font-body text-sm font-medium text-ink mb-3">
                            Current year
                        </label>
                        <div className="flex gap-3">
                            {[1, 2, 3, 4, 5].map((y) => (
                                <button
                                    key={y}
                                    type="button"
                                    onClick={() => setForm((f) => ({ ...f, year: y }))}
                                    className={`w-12 h-12 font-mono font-medium text-sm border transition-all ${form.year === y
                                            ? 'bg-ink text-paper border-ink'
                                            : 'bg-paper text-ink border-ink/20 hover:border-ink/50'
                                        }`}
                                    style={{ borderRadius: '2px' }}
                                >
                                    {y}
                                </button>
                            ))}
                        </div>
                        {errors.year && <p className="mt-1 font-mono text-xs text-signal">{errors.year}</p>}
                    </div>

                    {/* Skills tag input */}
                    <div>
                        <label htmlFor="skillInput" className="block font-body text-sm font-medium text-ink mb-2">
                            Current skills
                            <span className="text-ink-faint font-normal ml-2">Type and press Enter or comma</span>
                        </label>

                        {/* Tags */}
                        {form.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {form.skills.map((skill) => (
                                    <span key={skill} className="tag-pill gap-2">
                                        {skill}
                                        <button
                                            type="button"
                                            onClick={() => removeSkill(skill)}
                                            className="text-paper/60 hover:text-paper ml-1 leading-none"
                                            aria-label={`Remove ${skill}`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="relative">
                            <input
                                id="skillInput"
                                type="text"
                                placeholder="e.g. Python, React, SQL..."
                                value={skillInput}
                                onChange={(e) => handleSkillInput(e.target.value)}
                                onKeyDown={handleSkillKeyDown}
                                className="input-base"
                                aria-invalid={!!errors.skills}
                                autoComplete="off"
                                aria-autocomplete="list"
                            />
                            {filteredSuggestions.length > 0 && (
                                <ul className="absolute z-20 w-full bg-paper border border-ink/20 mt-0.5 py-1 shadow-hard" role="listbox">
                                    {filteredSuggestions.map((s) => (
                                        <li key={s}>
                                            <button
                                                type="button"
                                                role="option"
                                                onClick={() => addSkill(s)}
                                                className="w-full text-left px-4 py-2 font-body text-sm text-ink hover:bg-ink/5 transition-colors"
                                            >
                                                {s}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        {errors.skills && <p className="mt-1 font-mono text-xs text-signal">{errors.skills}</p>}
                    </div>

                    {/* Career goal */}
                    <div>
                        <label htmlFor="careerGoal" className="block font-body text-sm font-medium text-ink mb-2">
                            Career goal
                        </label>
                        <select
                            id="careerGoal"
                            value={form.careerGoal}
                            onChange={(e) => setForm((f) => ({ ...f, careerGoal: e.target.value }))}
                            className="input-base"
                            aria-invalid={!!errors.careerGoal}
                        >
                            <option value="">Where do you want to be in 2 years?</option>
                            {CAREER_GOALS.map((g) => <option key={g}>{g}</option>)}
                        </select>
                        {errors.careerGoal && <p className="mt-1 font-mono text-xs text-signal">{errors.careerGoal}</p>}

                        {form.careerGoal === 'Other' && (
                            <div className="mt-3">
                                <input
                                    type="text"
                                    placeholder="Describe your career goal"
                                    value={form.careerGoalCustom}
                                    onChange={(e) => setForm((f) => ({ ...f, careerGoalCustom: e.target.value }))}
                                    className="input-base"
                                    aria-invalid={!!errors.careerGoalCustom}
                                />
                                {errors.careerGoalCustom && <p className="mt-1 font-mono text-xs text-signal">{errors.careerGoalCustom}</p>}
                            </div>
                        )}
                    </div>

                    {/* Optional academic and career details */}
                    <div className="space-y-4">
                        <p className="font-mono text-xs tracking-widest uppercase text-ink-faint">
                            Additional details <span className="normal-case tracking-normal">(optional)</span>
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="cgpa" className="block font-body text-sm font-medium text-ink mb-2">
                                    CGPA (0–10)
                                </label>
                                <input
                                    id="cgpa"
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="any"
                                    {...register('cgpa', { setValueAs: (value) => value === '' ? undefined : Number(value) })}
                                    className="input-base"
                                    aria-invalid={!!detailErrors.cgpa}
                                />
                                {detailErrors.cgpa && <p className="mt-1 font-mono text-xs text-signal">{detailErrors.cgpa.message}</p>}
                            </div>
                            <div>
                                <label htmlFor="backlogs" className="block font-body text-sm font-medium text-ink mb-2">
                                    Backlogs
                                </label>
                                <input
                                    id="backlogs"
                                    type="number"
                                    min="0"
                                    step="1"
                                    {...register('backlogs', { setValueAs: (value) => value === '' ? undefined : Number(value) })}
                                    className="input-base"
                                    aria-invalid={!!detailErrors.backlogs}
                                />
                                {detailErrors.backlogs && <p className="mt-1 font-mono text-xs text-signal">{detailErrors.backlogs.message}</p>}
                            </div>
                            <div>
                                <label htmlFor="targetRole" className="block font-body text-sm font-medium text-ink mb-2">
                                    Target role
                                </label>
                                <input
                                    id="targetRole"
                                    type="text"
                                    maxLength="100"
                                    {...register('targetRole')}
                                    className="input-base"
                                    aria-invalid={!!detailErrors.targetRole}
                                />
                                {detailErrors.targetRole && <p className="mt-1 font-mono text-xs text-signal">{detailErrors.targetRole.message}</p>}
                            </div>
                            <div>
                                <label htmlFor="weeklyClassHours" className="block font-body text-sm font-medium text-ink mb-2">
                                    Weekly class hours (0–60)
                                </label>
                                <input
                                    id="weeklyClassHours"
                                    type="number"
                                    min="0"
                                    max="60"
                                    step="any"
                                    {...register('weeklyClassHours', { setValueAs: (value) => value === '' ? undefined : Number(value) })}
                                    className="input-base"
                                    aria-invalid={!!detailErrors.weeklyClassHours}
                                />
                                {detailErrors.weeklyClassHours && <p className="mt-1 font-mono text-xs text-signal">{detailErrors.weeklyClassHours.message}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Daily hours slider */}
                    <div>
                        <label htmlFor="dailyHours" className="block font-body text-sm font-medium text-ink mb-3">
                            Daily study hours available
                            <span className="font-mono text-signal ml-2">{form.dailyHours}h / day</span>
                        </label>
                        <input
                            id="dailyHours"
                            type="range"
                            min="1"
                            max="8"
                            value={form.dailyHours}
                            onChange={(e) => setForm((f) => ({ ...f, dailyHours: parseInt(e.target.value) }))}
                            className="w-full accent-signal h-1"
                            aria-valuemin={1}
                            aria-valuemax={8}
                            aria-valuenow={form.dailyHours}
                        />
                        <div className="flex justify-between font-mono text-xs text-ink-faint mt-1">
                            <span>1h</span>
                            <span>4h</span>
                            <span>8h</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary w-full"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
                                Setting up your path…
                            </>
                        ) : (
                            'Complete setup — see my dashboard →'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
