// Backend-managed Twitch auth (OAuth Authorization Code flow).
//
// The backend (boik.app) owns the Client Secret and the refresh token. This
// module never sees either: it just bounces the user to the backend's login
// entry point and reads the current access token back out of the session.
//
// The access token *does* reach the browser — unavoidable, since the IRC
// connection uses it as its password (PASS oauth:<token>). The win of the code
// flow is that the long-lived refresh token stays server-side, so the backend
// can mint fresh access tokens without forcing the user to log in again.

const API_BASE = import.meta.env.VITE_STREAM_API_BASE ?? "";

export type AuthUser = { token: string; login: string };

type SessionResponse = {
	authenticated: boolean;
	login?: string;
	accessToken?: string;
};

// Full-page redirect to the backend, which forwards to Twitch and ultimately
// back to `return` once the .boik.app session cookie is set.
export function login() {
	const url = new URL(`${API_BASE}/twitch-auth/start`, window.location.origin);
	url.searchParams.set("return", window.location.href);
	window.location.href = url.toString();
}

// Ask the backend for the current session. Returns a live access token
// (refreshed server-side as needed) or null when logged out. Sends the session
// cookie via credentials: "include".
export async function getSession(): Promise<AuthUser | null> {
	try {
		const res = await fetch(`${API_BASE}/twitch-auth/session`, {
			credentials: "include",
		});
		if (!res.ok) {
			return null;
		}
		const data: SessionResponse = await res.json();
		if (data.authenticated && data.accessToken && data.login) {
			return { token: data.accessToken, login: data.login };
		}
		return null;
	} catch {
		return null;
	}
}

export async function logout() {
	try {
		await fetch(`${API_BASE}/twitch-auth/logout`, {
			method: "POST",
			credentials: "include",
		});
	} catch {
		// Best-effort; the UI treats the user as logged out regardless.
	}
}
