import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Config padrão do Vite. Não precisa mexer aqui a menos que o projeto
// passe a precisar de outra porta ou de um proxy pra API em dev.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
})
