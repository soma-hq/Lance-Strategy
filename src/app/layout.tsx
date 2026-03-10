import type { Metadata } from "next";
import { Cinzel_Decorative, Cinzel, Rajdhani } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

const cinzelDecorative = Cinzel_Decorative({
	subsets: ["latin"],
	weight: ["400", "700", "900"],
	variable: "--font-cinzel-decorative",
	display: "swap",
});

const cinzel = Cinzel({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800", "900"],
	variable: "--font-cinzel",
	display: "swap",
});

const rajdhani = Rajdhani({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
	variable: "--font-rajdhani",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Lance Strategy",
	description: "Application de gestion Lance Strategy",
};

/**
 * Root layout wrapping all providers
 * @param children - Page content
 * @returns HTML shell with all context providers
 */

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="fr" className={`${cinzelDecorative.variable} ${cinzel.variable} ${rajdhani.variable}`}>
			<body>
				<AuthProvider>
					<ThemeProvider>
						<ToastProvider>
							<ConfirmProvider>{children}</ConfirmProvider>
						</ToastProvider>
					</ThemeProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
