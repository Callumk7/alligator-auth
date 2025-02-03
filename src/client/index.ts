import type { UserCredentials, UserData } from "../types.js";

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

	async register(credentials: UserCredentials): Promise<boolean> {
		const { email, password } = credentials;
		const res = await this.fetch(
			"/register",
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

	async verify(): Promise<boolean> {
		const res = await this.fetch("/protected/verify", "GET");

		if (res.ok) {
			return true;
		}

		return false;
	}

	async logout(): Promise<void> {
		const res = await this.fetch("/logout", "POST");

		if (res.ok) {
			this.isAuthenticated = false;
		}
	}

	async getCurrentUser(): Promise<UserData> {
		const res = await this.fetch("/protected/me", "GET");
		if (res.ok) return (await res.json()) as UserData;

		throw new Error("Failed to fetch data");
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
