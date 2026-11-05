/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,jsx}',
    ],
    theme: {
        extend: {
            colors: {
                bg: 'rgb(var(--bg-rgb) / <alpha-value>)',
                'bg-elevated': 'var(--bg-elevated)',
                surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
                'surface-2': 'rgb(var(--surface-2-rgb) / <alpha-value>)',
                border: 'rgb(var(--border-rgb) / <alpha-value>)',
                'border-strong': 'rgb(var(--border-strong-rgb) / <alpha-value>)',
                text: 'rgb(var(--text-rgb) / <alpha-value>)',
                'text-muted': 'rgb(var(--text-muted-rgb) / <alpha-value>)',
                'text-faint': 'rgb(var(--text-faint-rgb) / <alpha-value>)',
                accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
                'accent-strong': 'rgb(var(--accent-strong-rgb) / <alpha-value>)',
                'accent-soft': 'var(--accent-soft)',
                blue: 'rgb(var(--blue-rgb) / <alpha-value>)',
                mint: 'rgb(var(--mint-rgb) / <alpha-value>)',
                danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
                warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
                focus: 'rgb(var(--focus-rgb) / <alpha-value>)',
                paper: 'rgb(var(--bg-rgb) / <alpha-value>)',
                'paper-dark': 'rgb(var(--surface-2-rgb) / <alpha-value>)',
                ink: 'rgb(var(--text-rgb) / <alpha-value>)',
                'ink-muted': 'rgb(var(--text-muted-rgb) / <alpha-value>)',
                'ink-faint': 'rgb(var(--text-faint-rgb) / <alpha-value>)',
                signal: 'rgb(var(--accent-rgb) / <alpha-value>)',
                'signal-dark': 'rgb(var(--accent-strong-rgb) / <alpha-value>)',
                'signal-light': 'rgb(var(--accent-light-rgb) / <alpha-value>)',
                forest: 'rgb(var(--mint-rgb) / <alpha-value>)',
                olive: 'rgb(var(--blue-rgb) / <alpha-value>)',
                'olive-light': 'rgb(var(--blue-rgb) / <alpha-value>)',
                mono: 'rgb(var(--surface-2-rgb) / <alpha-value>)',
            },
            fontFamily: {
                display: ['Inter', 'sans-serif'],
                body: ['Inter', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            fontSize: {
                '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
                '9xl': ['8rem', { lineHeight: '0.9', letterSpacing: '-0.05em' }],
            },
            boxShadow: {
                'hard-sm': '2px 2px 0px rgb(var(--text-rgb) / 0.14)',
                hard: '4px 4px 0px rgb(var(--text-rgb) / 0.14)',
                'hard-lg': '6px 6px 0px rgb(var(--text-rgb) / 0.14)',
                'hard-signal': '4px 4px 0px rgb(var(--accent-rgb) / 0.8)',
            },
            borderRadius: {
                DEFAULT: '2px',
                sm: '1px',
                lg: '4px',
            },
            animation: {
                'draw-line': 'drawLine 1.5s ease forwards',
                'fade-in': 'fadeIn 0.5s ease forwards',
                'slide-up': 'slideUp 0.4s ease forwards',
            },
            keyframes: {
                drawLine: {
                    from: { 'stroke-dashoffset': '1000' },
                    to: { 'stroke-dashoffset': '0' },
                },
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                slideUp: {
                    from: { opacity: '0', transform: 'translateY(16px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
