import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SensorProvider } from './context/SensorContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* AuthProvider fica acima de tudo porque quase todas as telas
          precisam saber se tem alguem logado e qual o perfil dele.
          SensorProvider fica dentro porque so faz sentido simular
          sensores pra quem esta logado, mas acima das rotas porque
          o estado precisa ser o mesmo em qualquer tela — ver
          context/SensorContext.jsx */}
      <AuthProvider>
        <SensorProvider>
          <App />
        </SensorProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
