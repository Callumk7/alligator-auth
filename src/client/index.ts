interface UserCredentials {
	email: string;
	password: string;
}

export class Alligator {
	private tenantId: number;
	private baseUrl = "http://localhost:4000/api";

	constructor(tenantId: number) {
		this.tenantId = tenantId;
	}

	async login(credentials: UserCredentials): Promise<boolean> {
		const { email, password } = credentials;
		const res = await this.fetchBase(
			"/login",
			"POST",
			JSON.stringify({ email, password, tenant_id: this.tenantId }),
		);

		if (res.ok) {
			return true;
		}

		return false;
	}

	private async fetchBase(endpoint: string, method: string, body?: string) {
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
