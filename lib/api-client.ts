const BASE_URL = "/api";

/**
 * Handle a non-OK HTTP response
 * @param response - Fetch response object
 * @returns Parsed error
 * @throws API error with message
 */

async function handleError(response: Response): Promise<never> {
	let message = `HTTP ${response.status}`;
	try {
		const data = await response.json();
		message = data.error || data.message || message;
	} catch {
		// Keep default message
	}

	if (response.status === 401) {
		window.location.href = "/login";
	}

	throw new Error(message);
}

/**
 * Make a fetch request with credentials included
 * @param path - API path (without /api prefix)
 * @param options - Fetch options
 * @returns Parsed JSON response
 */

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(`${BASE_URL}${path}`, {
		...options,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	});

	if (!response.ok) return handleError(response);

	// Handle empty responses
	const text = await response.text();
	if (!text) return {} as T;

	return JSON.parse(text) as T;
}

/**
 * Send a GET request to the API
 * @param path - API endpoint path
 * @returns Parsed response data
 */

export async function get<T>(path: string): Promise<T> {
	return request<T>(path);
}

/**
 * Send a POST request to the API
 * @param path - API endpoint path
 * @param body - Request body data
 * @returns Parsed response data
 */

export async function post<T>(path: string, body: unknown): Promise<T> {
	return request<T>(path, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

/**
 * Send a PUT request to the API
 * @param path - API endpoint path
 * @param body - Request body data
 * @returns Parsed response data
 */

export async function put<T>(path: string, body: unknown): Promise<T> {
	return request<T>(path, {
		method: "PUT",
		body: JSON.stringify(body),
	});
}

/**
 * Send a DELETE request to the API
 * @param path - API endpoint path
 * @returns Parsed response data
 */

export async function del<T>(path: string): Promise<T> {
	return request<T>(path, { method: "DELETE" });
}

const api = { get, post, put, delete: del };

export default api;
