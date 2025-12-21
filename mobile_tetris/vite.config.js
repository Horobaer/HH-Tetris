import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // Use relative paths for assets to ensure it works in any subfolder
  server: {
    host: true // Expose to network for mobile testing if needed
  }
})
