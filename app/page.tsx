import { redirect } from "next/navigation";

/**
 * Root page — redirect to dashboard
 * @returns Never (redirects)
 */

export default function Home() {
	redirect("/dashboard");
}
