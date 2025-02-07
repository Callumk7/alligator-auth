import type { UserCredentials, UserData } from "../types.js";
import { extractCookie, getCookies } from "../utils.js";

export class AlligatorServer {
	private baseAuthUrl = "http://localhost:4000/api";
	private tenantId: number;

	constructor(tenantId: number) {
		this.tenantId = tenantId;
	}

	async register(
		{ email, password }: UserCredentials,
		externalId?: string,
	): Promise<Response> {
		try {
			const res = await fetch(`${this.baseAuthUrl}/register`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					email,
					password,
					tenant_id: this.tenantId,
					external_id: externalId,
				}),
			});

			if (res.ok) {
				console.log("res ok");
				return res;
			}

			console.error("Failed to register user");
			return new Response("Failed to register user", { status: 400 });
		} catch (error) {
			console.error("Failed to register user, with error: ", error);
			return new Response("Failed to register user", { status: 400 });
		}
	}

	// If this is going to interact with a client application, then the whole response needs to
	// be returned to the client, so that the cookies can be correctly set. This isn't hugely
	// clear from a client API perspective - but for those use cases we have the client side
	// package that would work better for initially setting the cookies for the user.
	async login({ email, password }: UserCredentials): Promise<Response> {
		try {
			const res = await fetch(`${this.baseAuthUrl}/login`, {
				method: "POST",
				credentials: "include",
				body: JSON.stringify({ email, password, tenant_id: this.tenantId }),
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (res.ok) {
				return res;
			}

			console.error("Failed to login");
			return new Response("Unauthorized", { status: 415 });
		} catch (error) {
			console.error(error);
			return new Response("Server Error", { status: 500 });
		}
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

			// TODO: Validation? Probably not, just testing
			return response.json();
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

	private getCookies = getCookies;
	private extractCookie = extractCookie;
}
