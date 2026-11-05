import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { loginSchema } from '../lib/validators.js';
import SynapseSignalPanel from '../components/SynapseSignalPanel.jsx';

function SignalLogo() {
    return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="4" cy="14" r="2.5" fill="var(--accent)" />
            <circle cx="14" cy="6" r="2.5" fill="var(--accent)" />
            <circle cx="24" cy="14" r="2.5" fill="var(--accent)" />
            <circle cx="14" cy="22" r="2.5" fill="var(--accent)" />
            <line x1="4" y1="14" x2="14" y2="6" stroke="var(--text)" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="14" y1="6" x2="24" y2="14" stroke="var(--text)" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="24" y1="14" x2="14" y2="22" stroke="var(--text)" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="14" y1="22" x2="4" y2="14" stroke="var(--text)" strokeWidth="1.5" strokeOpacity="0.4" />
        </svg>
    );
}

export default function Login() {
    const { login, getDashboardPath } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const from = location.state?.from?.pathname;

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
    } = useForm({
        resolver: zodResolver(loginSchema),
        mode: 'onBlur',
    });

    const onSubmit = async (values) => {
        setIsLoading(true);
        setServerError('');
        try {
            const data = await login(values);
            if (data.success) {
                const dest = from && from !== '/login' ? from : getDashboardPath(data.user);
                navigate(dest, { replace: true });
            }
        } catch (err) {
            const resp = err.response?.data;
            const msg = resp?.errors?.general || resp?.message || 'Invalid email or password.';
            setServerError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Left: Form */}
            <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-paper">
                <div className="w-full max-w-md mx-auto">
                    {/* Logo */}
                    <Link to="/" className="inline-flex items-center gap-2 mb-10 group">
                        <SignalLogo />
                        <span className="font-display font-bold text-xl tracking-tight text-ink">SYNAPSE</span>
                    </Link>

                    <div className="mb-8">
                        <p className="font-mono text-xs tracking-widest uppercase text-ink-faint mb-2">Welcome back</p>
                        <h1 className="font-display text-3xl font-bold text-ink leading-tight">Sign in</h1>
                    </div>

                    {serverError && (
                        <div className="mb-6 px-4 py-3 bg-signal/10 border border-signal/30 text-signal font-body text-sm" role="alert" aria-live="assertive">
                            {serverError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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
                            {errors.email && (
                                <p className="mt-1 font-mono text-xs text-signal" id="email-error" role="alert">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label htmlFor="password" className="block font-body text-sm font-medium text-ink">
                                    Password
                                </label>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="Your password"
                                    className="input-base pr-12"
                                    aria-invalid={!!errors.password}
                                    aria-describedby={errors.password ? 'password-error' : undefined}
                                    {...register('password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        {showPassword ? (
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
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1 font-mono text-xs text-signal" id="password-error" role="alert">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        {/* Remember me */}
                        <div className="flex items-center gap-2">
                            <input
                                id="rememberMe"
                                type="checkbox"
                                className="w-4 h-4 accent-signal"
                                {...register('rememberMe')}
                            />
                            <label htmlFor="rememberMe" className="font-body text-sm text-ink-muted cursor-pointer">
                                Keep me signed in for 30 days
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                                    Signing in…
                                </>
                            ) : (
                                'Sign in →'
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center font-body text-sm text-ink-faint">
                        No account yet?{' '}
                        <Link to="/signup" className="text-ink font-medium underline underline-offset-2 hover:text-signal transition-colors">
                            Create one
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right: Signal panel */}
            <SynapseSignalPanel
                quote="Your batch moves fast. SYNAPSE keeps you in sync."
                subtext="Sign in to see your tasks, roadmap, and next deadline — all in one place."
            />
        </div>
    );
}
