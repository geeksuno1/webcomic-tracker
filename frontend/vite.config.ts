import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set automatically by the GitHub Actions workflow to "/<repo-name>/"
  // so the built site works on GitHub Pages. Defaults to "/" for local dev.
  base: process.env.VITE_BASE_PATH || '/',
})
