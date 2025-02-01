export const getCookies = (request: Request): string => {
	return request.headers.get("cookie") || "";
};

export const extractCookie = (cookies: string, key: string): string | undefined => {
	const cookieMap = new Map(
		cookies.split("; ").map((cookie) => {
			const [name = "", value = ""] = cookie.split("=");
			return [name, decodeURIComponent(value)];
		}),
	);

	return cookieMap.get(key);
};
