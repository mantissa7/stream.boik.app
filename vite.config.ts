import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	// In dev we proxy the backend routes so the app and API share
	// http://localhost:5174 — this matches the registered Twitch OAuth redirect
	// (http://localhost:5174/twitch-auth) and lets the session cookie be rewritten
	// onto localhost. Point VITE_DEV_API_PROXY at a local backend to develop the
	// auth flow end-to-end; otherwise it falls through to production.
	const proxyTarget = env.VITE_DEV_API_PROXY || "https://boik.app";
	const backendProxy = {
		target: proxyTarget,
		changeOrigin: true,
		secure: false,
		cookieDomainRewrite: "localhost",
	};

	return {
		plugins: [vue(), vueDevTools()],
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
			},
		},
		server: {
			port: 5174,
			strictPort: true,
			proxy: {
				"/twitch-auth": backendProxy,
				"/youtube": backendProxy,
			},
		},
	};
});
