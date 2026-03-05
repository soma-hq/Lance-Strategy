import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: "#2e4a8a",
					dark: "#1a2744",
					mid: "#3a5491",
					soft: "#4a6ab0",
					light: "rgba(26, 39, 68, 0.1)",
				},
				accent: {
					DEFAULT: "#b8923a",
					dark: "#96731f",
					hover: "#d4aa5a",
					light: "rgba(184, 146, 58, 0.12)",
				},
				success: {
					DEFAULT: "#2d7a4f",
					light: "#d6f0e2",
				},
				warning: {
					DEFAULT: "#b8923a",
					light: "rgba(184, 146, 58, 0.15)",
				},
				danger: {
					DEFAULT: "#c0392b",
					light: "#fce8e6",
				},
				info: {
					DEFAULT: "#2e3f72",
					light: "rgba(46, 63, 114, 0.1)",
				},
				sidebar: "#1a2744",
				cream: "#f8f5ef",
			},
			fontFamily: {
				sans: [
					"var(--font-inter)",
					"Inter",
					"-apple-system",
					"BlinkMacSystemFont",
					"sans-serif",
				],
				heading: ["var(--font-manrope)", "Manrope", "sans-serif"],
			},
			borderRadius: {
				sm: "6px",
				DEFAULT: "10px",
				md: "10px",
				lg: "14px",
				xl: "20px",
			},
			boxShadow: {
				sm: "0 1px 3px rgba(26, 39, 68, 0.08)",
				DEFAULT: "0 2px 8px rgba(26, 39, 68, 0.07)",
				md: "0 4px 12px rgba(26, 39, 68, 0.09)",
				lg: "0 8px 24px rgba(26, 39, 68, 0.11)",
				xl: "0 16px 40px rgba(26, 39, 68, 0.13), 0 4px 8px rgba(26, 39, 68, 0.06)",
				manga: "0 4px 14px rgba(0, 0, 0, 0.15)",
				"manga-hover": "0 6px 22px rgba(0, 0, 0, 0.2)",
			},
			transitionTimingFunction: {
				slow: "cubic-bezier(0.4, 0, 0.2, 1)",
			},
		},
	},
	plugins: [],
};

export default config;
