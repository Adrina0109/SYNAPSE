import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { signupSchema, checkPasswordStrength } from '../lib/validators.js';
import SynapseSignalPanel from '../components/SynapseSignalPanel.jsx';

const ROLE_OPTIONS = [
    { value: 'student', label: 'Student', desc: 'Join your batch, track your path' },
    { value: 'mentor', label: 'Mentor', desc: 'Guide students, manage milestones' },
    { value: 'admin', label: 'Admin', desc: 'Coordinate the whole batch' },
];

const PasswordStrength = ({ password }) => {
    const { rules, score } = checkPasswordStrength(password || '');
    if (!password) return null;

    const colors = ['bg-signal', 'bg-signal', 'bg-yellow-500', 'bg-olive', 'bg-forest'];
    const labels = ['', 'Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

    return (
        <div className="mt-2 space-y-2">
            <div className="flex gap-1">
                {rules.map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-sm transition-colors duration-300 ${i < score ? colors[score - 1] : 'bg-ink/10'}`} />
                ))}
            </div>
            <p className="font-mono text-xs text-ink-faint">{labels[score]}</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                {rules.map((rule) => (
                    <li key={rule.id} className={`flex items-center gap-1.5 font-mono text-xs transition-colors ${rule.met ? 'text-forest' : 'text-ink-faint'}`}>
                        <span className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center text-[9px] ${rule.met ? 'bg-forest border-forest text-paper' : 'border-ink/20'}`}>
                            {rule.met ? '✓' : ''}
                        </span>
                        {rule.label}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default function Signup() {
    const { signup, getDashboardPath } = useAuth();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [serverErrors, setServerErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, touchedFields },
        setError,
    } = useForm({
        resolver: zodResolver(signupSchema),
        defaultValues: { role: 'student' },
        mode: 'onBlur',
    });

    const selectedRole = watch('role');
    const password = watch('password');
    const needsInvite = selectedRole === 'mentor' || selectedRole === 'admin';

    const onSubmit = async (values) => {
        setIsLoading(true);
        setServerErrors({});
        try {
            const data = await signup(values);
            if (data.success) navigate(getDashboardPath(data.user));
        } catch (err) {
            const resp = err.response?.data;
            if (resp?.errors) {
                Object.entries(resp.errors).forEach(([field, msg]) => {
                    if (field === 'general') {
                        setServerErrors({ general: msg });
                    } else {
                        setError(field, { type: 'server', message: msg });
                    }
                });
            } else {
                setServerErrors({ general: resp?.message || 'Something went wrong. Please try again.' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const EyeIcon = ({ show }) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {show ? (
                <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                </>
            ) : (
                <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </>
            )}
        </svg>
    );

    const FieldError = ({ name }) => {
        const err = errors[name];
        if (!err) return null;
        return (
            <p className="mt-1 font-mono text-xs text-signal" id={`${name}-error`} role="alert">
                {err.message}
            </p>
        );
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {/* Left: Form */}
            <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-paper min-h-screen lg:min-h-0">
                <div className="w-full max-w-md mx-auto">
                    {/* Logo */}
                    <Link to="/" className="inline-flex items-center gap-2 mb-10 group">
                        <SignalLogo />
                        <span className="font-display font-bold text-xl tracking-tight text-ink">SYNAPSE</span>
                    </Link>

                    <div className="mb-8">
                        <p className="font-mono text-xs tracking-widest uppercase text-ink-faint mb-2">Join your batch</p>
                        <h1 className="font-display text-3xl font-bold text-ink leading-tight">Create an account</h1>
                    </div>

                    {serverErrors.general && (
                        <div className="mb-6 px-4 py-3 bg-signal/10 border border-signal/30 text-signal font-body text-sm" role="alert">
                            {serverErrors.general}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                        {/* Role selector */}
                        <div>
                            <label className="block font-body text-sm font-medium text-ink mb-2">
                                I am a
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {ROLE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setValue('role', opt.value, { shouldValidate: true })}
                                        className={`px-3 py-2.5 text-left border transition-all duration-150 ${selectedRole === opt.value
                                                ? 'border-ink bg-ink text-paper'
                                                : 'border-ink/20 bg-paper text-ink hover:border-ink/50'
                                            }`}
                                        style={{ borderRadius: '2px' }}
                                    >
                                        <div className="font-body text-xs font-medium">{opt.label}</div>
                                    </button>
                                ))}
                            </div>
                            {errors.role && <p className="mt-1 font-mono text-xs text-signal">{errors.role.message}</p>}
                        </div>

                        {/* Full name */}
                        <div>
                            <label htmlFor="name" className="block font-body text-sm font-medium text-ink mb-1.5">
                                Full name
                            </label>
                            <input
                                id="name"
                                type="text"
                                autoComplete="name"
                                placeholder="Aarav Sharma"
                                className="input-base"
                                aria-invalid={!!errors.name}
                                aria-describedby={errors.name ? 'name-error' : undefined}
                                {...register('name')}
                            />
                            <FieldError name="name" />
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block font-body text-sm font-medium text-ink mb-1.5">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="you@college.edu"
                                className="input-base"
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? 'email-error' : undefined}
                                {...register('email')}
                            />
                            <FieldError name="email" />
                        </div>

                        {/* Invite code (conditional) */}
                        {needsInvite && (
                            <div className="animate-slide-up">
                                <label htmlFor="inviteCode" className="block font-body text-sm font-medium text-ink mb-1.5">
                                    Invite code <span className="text-ink-faint font-normal">(required for {selectedRole})</span>
                                </label>
                                <input
                                    id="inviteCode"
                                    type="text"
                                    placeholder="Enter your invite code"
                                    className="input-base font-mono tracking-widest"
                                    aria-invalid={!!errors.inviteCode}
                                    aria-describedby={errors.inviteCode ? 'inviteCode-error' : undefined}
                                    {...register('inviteCode')}
                                />
                                <FieldError name="inviteCode" />
                            </div>
                        )}

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block font-body text-sm font-medium text-ink mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    placeholder="Minimum 8 characters"
                                    className="input-base pr-12"
                                    aria-invalid={!!errors.password}
                                    aria-describedby={errors.password ? 'password-error' : 'password-strength'}
                                    {...register('password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    <EyeIcon show={showPassword} />
                                </button>
                            </div>
                            <FieldError name="password" />
                            <div id="password-strength">
                                <PasswordStrength password={password} />
                            </div>
                        </div>

                        {/* Confirm password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block font-body text-sm font-medium text-ink mb-1.5">
                                Confirm password
                            </label>
                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    type={showConfirm ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    placeholder="Repeat your password"
                                    className="input-base pr-12"
                                    aria-invalid={!!errors.confirmPassword}
                                    aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                                    {...register('confirmPassword')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
                                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                >
                                    <EyeIcon show={showConfirm} />
                                </button>
                            </div>
                            <FieldError name="confirmPassword" />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
                                    Creating account…
                                </>
                            ) : (
                                'Create account →'
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center font-body text-sm text-ink-faint">
                        Already have an account?{' '}
                        <Link to="/login" className="text-ink font-medium underline underline-offset-2 hover:text-signal transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right: Signal panel */}
            <SynapseSignalPanel
                quote="Every great engineer started by not knowing where to start."
                subtext="SYNAPSE turns scattered signals into one clear path forward."
            />
        </div>
    );
}

function SignalLogo() {
    return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="4" cy="14" r="2.5" fill="#E8401C" />
            <circle cx="14" cy="6" r="2.5" fill="#E8401C" />
            <circle cx="24" cy="14" r="2.5" fill="#E8401C" />
            <circle cx="14" cy="22" r="2.5" fill="#E8401C" />
            <line x1="4" y1="14" x2="14" y2="6" stroke="#16140F" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="14" y1="6" x2="24" y2="14" stroke="#16140F" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="24" y1="14" x2="14" y2="22" stroke="#16140F" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="14" y1="22" x2="4" y2="14" stroke="#16140F" strokeWidth="1.5" strokeOpacity="0.4" />
        </svg>
    );
}
