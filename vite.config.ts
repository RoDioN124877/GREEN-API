import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Относительные пути к ассетам — сборка работает и на GitHub Pages
  // (https://<user>.github.io/<repo>/), и при открытии из любой подпапки.
  base: './',
  plugins: [react()],
})
