// ============================================================
// PONTO DE EXTENSAO PRINCIPAL DO PROJETO
// ============================================================
// Nenhuma pagina ou componente chama fetch() diretamente — todos
// passam por aqui. Isso significa que, quando a API RESTful do
// grupo estiver pronta, so este arquivo precisa mudar.
//
// Pra conectar a API real:
//   1. preencha VITE_API_URL no arquivo .env
//   2. em cada funcao abaixo, troque o bloco "mock" pelo bloco
//      "fetch real" que ja esta comentado logo abaixo dele
//   3. nao precisa mudar nada em pages/ ou components/
// ============================================================

import { mockAreas, mockShelters, mockUsers } from './mockData.js'

const API_URL = import.meta.env.VITE_API_URL
const hasRealApi = Boolean(API_URL)

// pequeno atraso artificial pra simular latencia de rede no mock —
// ajuda a notar bugs de loading que só apareceriam com API real
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

function authHeaders() {
  const token = sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ---------- autenticacao ----------

export async function login(email, password) {
  if (!hasRealApi) {
    await delay()
    const user = mockUsers.find((u) => u.email === email && u.password === password)
    if (!user) throw new Error('E-mail ou senha incorretos.')
    // um token de verdade vem assinado pelo backend (JWT, por exemplo);
    // aqui so geramos algo parecido pra simular o fluxo
    return { token: `mock-token-${user.role}`, user: { name: user.name, email: user.email, role: user.role } }
  }

  // --- fetch real (descomentar quando a API existir) ---
  // const res = await fetch(`${API_URL}/auth/login`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email, password }),
  // })
  // if (!res.ok) throw new Error('E-mail ou senha incorretos.')
  // return res.json() // espera-se { token, user: { name, email, role } }
}

// ---------- areas de risco ----------

export async function getAreas() {
  if (!hasRealApi) {
    await delay()
    return mockAreas
  }

  // --- fetch real ---
  // const res = await fetch(`${API_URL}/areas`, { headers: authHeaders() })
  // if (!res.ok) throw new Error('Não foi possível carregar as áreas de risco.')
  // return res.json()
}

export async function getAreaById(id) {
  if (!hasRealApi) {
    await delay()
    const area = mockAreas.find((a) => String(a.id) === String(id))
    if (!area) throw new Error('Área não encontrada.')
    return area
  }

  // --- fetch real ---
  // const res = await fetch(`${API_URL}/areas/${id}`, { headers: authHeaders() })
  // if (!res.ok) throw new Error('Área não encontrada.')
  // return res.json()
}

// ---------- abrigos ----------

export async function getSheltersByArea(areaId) {
  if (!hasRealApi) {
    await delay()
    return mockShelters.filter((s) => s.areaId === areaId)
  }

  // --- fetch real ---
  // const res = await fetch(`${API_URL}/areas/${areaId}/abrigos`, { headers: authHeaders() })
  // if (!res.ok) throw new Error('Não foi possível carregar os abrigos.')
  // return res.json()
}

export async function getAllShelters() {
  if (!hasRealApi) {
    await delay()
    return mockShelters
  }

  // --- fetch real ---
  // const res = await fetch(`${API_URL}/abrigos`, { headers: authHeaders() })
  // if (!res.ok) throw new Error('Não foi possível carregar os abrigos.')
  // return res.json()
}

// ---------- leituras de sensor (parte de IoT) ----------
// usada pelo hook useSensorSimulation.js — cada leitura simulada
// deveria, no sistema final, ser enviada pra API, que decide se
// aquilo vira um alerta (a logica de comparar com o limite fica
// no backend, nao aqui no front)

export async function postLeitura(areaId, value) {
  if (!hasRealApi) {
    // sem API ainda, nao ha o que enviar — quem simula o status
    // localmente é o proprio hook, so pra fins de demonstracao
    return null
  }

  // --- fetch real ---
  // const res = await fetch(`${API_URL}/areas/${areaId}/leituras`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', ...authHeaders() },
  //   body: JSON.stringify({ value, timestamp: new Date().toISOString() }),
  // })
  // if (!res.ok) throw new Error('Falha ao enviar leitura do sensor.')
  // return res.json()
}

// ---------- alertas (painel do gestor) ----------

export async function getActiveAlerts() {
  if (!hasRealApi) {
    await delay()
    // sem API, nao ha fonte de verdade pra alertas — a tela do
    // gestor usa o estado simulado vindo do useSensorSimulation
    return []
  }

  // --- fetch real ---
  // const res = await fetch(`${API_URL}/alertas?status=ativo`, { headers: authHeaders() })
  // if (!res.ok) throw new Error('Não foi possível carregar os alertas.')
  // return res.json()
}

export async function resolveAlert(alertId) {
  if (!hasRealApi) {
    await delay()
    return { id: alertId, resolved: true }
  }

  // --- fetch real ---
  // const res = await fetch(`${API_URL}/alertas/${alertId}/resolver`, {
  //   method: 'PUT',
  //   headers: authHeaders(),
  // })
  // if (!res.ok) throw new Error('Não foi possível resolver o alerta.')
  // return res.json()
}
