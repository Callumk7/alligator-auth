import type { UserData } from "../types.js";
import { extractCookie } from "../utils.js";

interface UserCredentials {
	email: string;
	password: string;
}

export class Alligator {
	private tenantId: number;
	private baseUrl = "http://localhost:4000/api";
	isAuthenticated = false;

	constructor(tenantId: number) {
		this.tenantId = tenantId;
	}

	async login(credentials: UserCredentials): Promise<boolean> {
		const { email, password } = credentials;
		const res = await this.fetch(
			"/login",
			"POST",
			JSON.stringify({ email, password, tenant_id: this.tenantId }),
		);

		if (res.ok) {
			this.isAuthenticated = true;
			return true;
		}

		this.isAuthenticated = false;
		return false;
	}

	async logout(): Promise<void> {
		//TODO: Complete logout functionality, review server implementation
	}

	async getCurrentUser(): Promise<UserData> {
		const res = await this.fetch("/protected/me", "GET");
		if (res.ok) return (await res.json()) as UserData;

		throw new Error("Failed to fetch data");
	}

	hasCookies() {
		const cookies = document.cookie;
		const accessToken = extractCookie(cookies, "access_token");
		const refreshToken = extractCookie(cookies, "refresh_token");

		return !!accessToken && !!refreshToken;
	}

	private async fetch(endpoint: string, method: string, body?: string) {
		return fetch(`${this.baseUrl}/${endpoint}`, {
			method: method,
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
			body,
		});
	}
}
