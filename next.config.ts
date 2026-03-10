import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		serverActions: {
			allowedOrigins: [
				"localhost:3000",
				"localhost:3001",
				"localhost:3002",
			],
		},
	},
};

export default nextConfig;
