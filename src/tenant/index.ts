interface UserData {
	id: number;
	email: string;
	role: string;
	tenant_id: number;
	inserted_at: string;
	updated_at: string;
}

export class AlligatorServer {
	private baseAuthUrl: string;

	constructor(baseAuthUrl: string) {
		this.baseAuthUrl = baseAuthUrl;
	}

	/**
	 * A function that provides a quick check for loader-based servers.
	 * The request is sent to the authentication server, and it returns either
	 * a redirect, or 200 "Verified";
	 */
	async verifyTokenForLoader(request: Request): Promise<Response> {
		try {
			const response = await fetch(`${this.baseAuthUrl}/protected/verify`, {
				method: "GET",
				headers: {
					Cookie: this.getCookies(request),
				},
			});

			if (!response.ok) {
				return new Response("Unauthorized", { status: 401 });
			}

			return new Response("Authorized", { status: 200 });
		} catch (error) {
			return new Response("Unauthorized", { status: 401 });
		}
	}

	/**
	 * Use this function to access user data from the authentication server. The response
	 * will include all user details from the authentication server.
	 * If the response is not OK, then a refresh attempt is made.
	 */
	async getUserFromRequest(request: Request): Promise<UserData> {
		try {
			const response = await fetch(`${this.baseAuthUrl}/protected/me`, {
				method: "GET",
				headers: {
					Cookie: this.getCookies(request),
				},
			});

			if (!response.ok) {
				throw new Error("Unable to authorize request");
			}

			const data = await response.json();
			console.log(data);
			return data;
		} catch (error) {
			throw new Error("Unable to authorize request");
		}
	}

	async refreshTokens(
		request: Request,
	): Promise<{ tokenRefreshed: boolean; headers?: Headers }> {
		try {
			const cookies = this.getCookies(request);
			const refreshToken = this.extractCookie(cookies, "refresh_token");
			console.log(refreshToken);
			if (!refreshToken) {
				throw new Error("No refresh token provided");
			}
			const refreshResponse = await fetch(`${this.baseAuthUrl}/refresh`, {
				method: "POST",
				credentials: "include",
				headers: {
					Cookie: cookies,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ refresh_token: refreshToken }),
			});

			if (!refreshResponse.ok) {
				console.log("failed the request attempt.");
				return { tokenRefreshed: false };
			}

			console.log("refresh attempt headers:");
			console.log(refreshResponse.headers);

			return {
				tokenRefreshed: true,
				headers: refreshResponse.headers,
			};
		} catch (error) {
			return { tokenRefreshed: false };
		}
	}

	private getCookies(request: Request): string {
		return request.headers.get("cookie") || "";
	}

	private extractCookie(cookies: string, key: string): string | undefined {
		const cookieMap = new Map(
			cookies.split("; ").map((cookie) => {
				const [name = "", value = ""] = cookie.split("=");
				return [name, decodeURIComponent(value)];
			}),
		);

		return cookieMap.get(key);
	}
}
