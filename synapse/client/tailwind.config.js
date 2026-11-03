/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,jsx}',
    ],
    theme: {
        extend: {
            colors: {
                paper: '#F4EFE6',
                'paper-dark': '#EDE6D8',
                ink: '#16140F',
                'ink-muted': '#3D3A32',
                'ink-faint': '#7A766E',
                signal: '#E8401C',
                'signal-dark': '#C4330F',
                'signal-light': '#F26144',
                forest: '#2A4030',
                olive: '#6B7A4A',
                'olive-light': '#8B9A6A',
                mono: '#F0EBE0',
            },
            fontFamily: {
                display: ['"Bricolage Grotesque"', 'serif'],
                body: ['"DM Sans"', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            fontSize: {
                '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
                '9xl': ['8rem', { lineHeight: '0.9', letterSpacing: '-0.05em' }],
            },
            boxShadow: {
                'hard-sm': '2px 2px 0px #16140F',
                hard: '4px 4px 0px #16140F',
                'hard-lg': '6px 6px 0px #16140F',
                'hard-signal': '4px 4px 0px #E8401C',
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
