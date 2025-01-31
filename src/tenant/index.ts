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

	// WARN: This is more microservice stuff, and not really what we want unless we
	// stick this in a cloudflare worker.. but then what is the point in that.
	async handleAuthenticateRequest(originalRequest: Request): Promise<Response> {
		try {
			const initResponse = await this.processRequestWithToken(originalRequest);

			if (initResponse.status !== 401) {
				return initResponse;
			}

			// if 401, we need to refresh the tokens
			const refreshResult = await this.refreshTokens(originalRequest);
			if (!refreshResult.tokenRefreshed) {
				return new Response(JSON.stringify({ error: "Authentication Failed" }), {
					status: 401,
					headers: { "Content-Type": "application/json" },
				});
			}

			return this.processRequestWithToken(
				this.recreateRequest(originalRequest, refreshResult.headers),
			);
		} catch (error) {
			return new Response(
				JSON.stringify({ error: "The request failed somewhere in the process" }),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	}

	private async processRequestWithToken(request: Request): Promise<Response> {
		try {
			const cookies = this.getCookies(request);

			const verificationResponse = await fetch(
				`${this.baseAuthUrl}/protected/verify`,
				{
					method: "GET",
					credentials: "include",
					headers: {
						Cookie: cookies,
					},
				},
			);

			// If the request is not a success, then we return unauthorized
			if (!verificationResponse.ok) {
				return new Response(null, { status: 401 });
			}

			return await fetch(request.url, {
				...this.cloneRequestOptions(request),
				headers: {
					...Object.fromEntries(request.headers),
					Cookie: cookies,
				},
			});
		} catch (error) {
			// Need to build in better error handling. This could be network errors, or something else
			return new Response(null, { status: 500 });
		}
	}

	// TODO: I would like to update this to just forward the cookies for the server, but
	// for now I am going to use the current implementation of the server
	// Changes to do:
	// {
	//	headers: {
	//		Cookie: cookies
	//	}
	// }
	//
	// Rather than extracting the refresh tokena and sending it as the body
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

	private cloneRequestOptions(request: Request): RequestInit {
		return {
			method: request.method,
			body: request.body,
			headers: Object.fromEntries(request.headers),
			credentials: "include",
		};
	}

	private recreateRequest(request: Request, headers?: Headers): Request {
		const requestInit = this.cloneRequestOptions(request);

		if (headers) {
			const setCookieHeaders = headers.getSetCookie();

			const newHeaders = new Headers(requestInit.headers);
			setCookieHeaders.forEach((cookieHeader) => {
				newHeaders.append("Cookie", cookieHeader);
			});

			// Modify headers to include the new cookies
			requestInit.headers = newHeaders;
		}

		return new Request(request.url, requestInit);
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
