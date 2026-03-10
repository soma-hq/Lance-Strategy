"use client";

import {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
} from "react";

type FontSize = "compact" | "normal" | "confort";

interface ThemeContextValue {
	dark: boolean;
	fontSize: FontSize;
	toggleDark: () => void;
	setFontSize: (size: FontSize) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
	dark: false,
	fontSize: "normal",
	toggleDark: () => {},
	setFontSize: () => {},
});

/**
 * Apply dark mode class to document
 * @param dark - Whether dark mode should be active
 */

function applyDark(dark: boolean) {
	const html = document.documentElement;
	const body = document.body;
	if (dark) {
		html.classList.add("dark");
		body.classList.add("theme-dark");
	} else {
		html.classList.remove("dark");
		body.classList.remove("theme-dark");
	}
}

/**
 * Apply font size class to body
 * @param size - Font size variant
 */

function applyFontSize(size: FontSize) {
	document.body.classList.remove("fs-compact", "fs-normal", "fs-confort");
	document.body.classList.add(`fs-${size}`);
}

/**
 * Provide theme (dark mode + font size) state to component tree
 * @param children - Child components
 * @returns Theme context provider
 */

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [dark, setDark] = useState(false);
	const [fontSize, setFontSizeState] = useState<FontSize>("normal");

	useEffect(() => {
		// Load saved preferences
		const savedDark = localStorage.getItem("theme") === "dark";
		const savedSize =
			(localStorage.getItem("fontSize") as FontSize) || "normal";
		setDark(savedDark);
		setFontSizeState(savedSize);
		applyDark(savedDark);
		applyFontSize(savedSize);
	}, []);

	const toggleDark = useCallback(() => {
		const next = !dark;
		setDark(next);
		localStorage.setItem("theme", next ? "dark" : "light");
		applyDark(next);
	}, [dark]);

	const setFontSize = useCallback((size: FontSize) => {
		setFontSizeState(size);
		localStorage.setItem("fontSize", size);
		applyFontSize(size);
	}, []);

	return (
		<ThemeContext.Provider
			value={{ dark, fontSize, toggleDark, setFontSize }}>
			{children}
		</ThemeContext.Provider>
	);
}
