import type { Config } from 'tailwindcss';

export default {
    content: ['./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}'],
    corePlugins: {
        preflight: false, // Disable preflight to avoid conflicts with Digdir's design system.
    },
    plugins: [],
} satisfies Config;
