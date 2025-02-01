export interface UserData {
	id: number;
	email: string;
	role: string;
	tenant_id: number;
	inserted_at: string;
	updated_at: string;
}

export interface UserCredentials {
	email: string;
	password: string;
}
