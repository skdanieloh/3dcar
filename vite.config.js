import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
// https://vite.dev/config/
export default defineConfig({
    base: "/3dcar/",
    plugins: [react()],
    resolve: {
        extensions: [".mjs", ".mts", ".tsx", ".ts", ".jsx", ".js", ".json"],
    },
});
