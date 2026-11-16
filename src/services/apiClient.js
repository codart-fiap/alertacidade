import { mockAreas, mockShelters, mockUsers } from './mockData.js'

// Pluvia publica os recursos na raiz (ex.: http://localhost:8080/areas-risco).
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const hasRealApi = Boolean(API_URL)

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

function authHeaders() {
  const token = sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}
async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Não foi possível conectar à API Pluvia. Confira se o back-end está ativo e se VITE_API_URL está correta.')
  }

  if (!response.ok) {
    let message
    try {
      const body = await response.json()
      message = body.mensagem || body.message
    } catch { /* A resposta pode não conter JSON. */ }
    if (response.status === 401 && sessionStorage.getItem('token')) {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
      message = 'Sua sessão expirou. Entre novamente para continuar.'
    }
    throw new Error(message || `A API Pluvia respondeu com erro (${response.status}).`)
  }
  if (response.status === 204) return null
  return response.json()
}

function mapPosition(latitude, longitude) {
  // O mapa atual do front usa um plano local. Esta projeção mantém os pontos
  // da região de demonstração de São Paulo dentro da área visível.
  return {
    x: Math.max(0.04, Math.min(0.96, (Number(longitude) + 46.72) / 0.16)),
    y: Math.max(0.04, Math.min(0.96, (-23.47 - Number(latitude)) / 0.12)),
  }
}

function mapArea(area, sensors, alerts) {
  const areaSensors = sensors.filter((sensor) => sensor.areaRiscoId === area.id)
  const latestAlert = alerts.find((alert) => alert.areaRiscoId === area.id)
  const sensor = areaSensors[0]
  const unit = sensor?.tipo === 'CHUVA' ? 'mm/h' : 'cm'
  const type = sensor?.tipo === 'CHUVA' ? 'Chuva' : 'Enchente'
  const position = mapPosition(area.latitude, area.longitude)
  return {
    id: area.id,
    name: area.nome,
    type,
    sensor: sensor?.tipo === 'CHUVA' ? 'Intensidade da chuva' : 'Nível do rio',
    value: latestAlert?.valorLeitura ?? 0,
    threshold: sensor?.limiteAlerta ?? 1,
    unit,
    x: position.x,
    y: position.y,
    latitude: area.latitude,
    longitude: area.longitude,
    radiusMeters: area.raioMetros,
    riskLevel: area.nivelRisco,
    active: area.ativa,
    instruction: latestAlert?.mensagem || '',
    sensors: areaSensors,
  }
}

export async function login(email, password) {
  if (!hasRealApi) {
    await delay()
    const user = mockUsers.find((item) => item.email === email && item.password === password)
    if (!user) throw new Error('E-mail ou senha incorretos.')
    return { token: `mock-token-${user.role}`, user: { name: user.name, email: user.email, role: user.role } }
  }

  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha: password }),
    headers: {},
  })
  const role = result.perfil === 'ADMIN' ? 'gestor' : 'cidadao'
  return {
    token: result.token,
    user: { name: email.split('@')[0], email, role, profile: result.perfil },
  }
}

export async function getDashboardData() {
  if (!hasRealApi) {
    await delay()
    return {
      areas: mockAreas.map((area) => ({ ...area, latitude: null, longitude: null, active: true })),
      sensors: mockAreas.map((area) => ({ ...area, areaId: area.id, areaName: area.name })),
      alerts: [],
      shelters: mockShelters,
    }
  }

  const [areas, sensors, alerts, points] = await Promise.all([
    request('/areas-risco'),
    request('/sensores'),
    request('/alertas'),
    request('/pontos-seguros'),
  ])
  return {
    areas: areas.map((area) => mapArea(area, sensors, alerts)),
    sensors: sensors.map((sensor) => {
      const area = areas.find((item) => item.id === sensor.areaRiscoId)
      const position = area ? mapPosition(area.latitude, area.longitude) : { x: 0.5, y: 0.5 }
      const isRain = sensor.tipo === 'CHUVA'
      return {
        id: sensor.id,
        areaId: sensor.areaRiscoId,
        areaName: sensor.areaRiscoNome,
        name: sensor.nome,
        type: isRain ? 'Chuva' : 'Enchente',
        sensor: isRain ? 'Intensidade da chuva' : 'Nível do rio',
        unit: isRain ? 'mm/h' : 'cm',
        value: sensor.ultimaLeitura ?? null,
        lastReadingAt: sensor.dataHoraUltimaLeitura,
        threshold: sensor.limiteAlerta,
        active: area?.ativa ?? false,
        riskLevel: area?.nivelRisco,
        x: position.x,
        y: position.y,
        latitude: area?.latitude,
        longitude: area?.longitude,
      }
    }),
    alerts: alerts.filter((alert) => areas.some((area) => area.id === alert.areaRiscoId && area.ativa))
      .filter((alert, index, list) => list.findIndex((item) => item.areaRiscoId === alert.areaRiscoId) === index)
      .map((alert) => ({
        id: alert.id,
        areaId: alert.areaRiscoId,
        time: new Date(alert.dataHora).toLocaleString('pt-BR'),
        value: alert.valorLeitura,
        instruction: alert.mensagem,
        level: alert.nivel,
        resolved: false,
      })),
    shelters: points.map((point) => ({
      id: point.id,
      name: point.nome,
      areaId: 0,
      latitude: point.latitude,
      longitude: point.longitude,
      ...mapPosition(point.latitude, point.longitude),
    })),
  }
}

export async function getAreas() {
  return (await getDashboardData()).areas
}

export async function getAreaById(id) {
  if (!hasRealApi) {
    const area = mockAreas.find((item) => String(item.id) === String(id))
    if (!area) throw new Error('Área não encontrada.')
    return area
  }
  const [area, sensors, alerts] = await Promise.all([
    request(`/areas-risco/${id}`), request('/sensores'), request('/alertas'),
  ])
  return mapArea(area, sensors, alerts)
}

export async function getActiveAlerts() {
  return (await getDashboardData()).alerts
}

export async function getAllShelters() {
  return (await getDashboardData()).shelters
}

export async function createSafePoint(point) {
  return request('/pontos-seguros', {
    method: 'POST',
    body: JSON.stringify({ nome: point.name.trim(), latitude: Number(point.latitude), longitude: Number(point.longitude) }),
  })
}

export async function getRecommendation(latitude, longitude) {
  return request(`/recomendacao?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`)
}

export async function postLeitura(sensorId, value) {
  if (!hasRealApi) return null
  return request(`/sensores/${sensorId}/leituras`, {
    method: 'POST',
    body: JSON.stringify({ valor: Number(value) }),
  })
}

export async function setRiskAreaActive(area, active) {
  return updateRiskArea(area.id, { ...area, active })
}

function riskAreaPayload(area) {
  return {
    nome: area.name.trim(),
    latitude: Number(area.latitude),
    longitude: Number(area.longitude),
    raioMetros: Number(area.radiusMeters),
    nivelRisco: area.riskLevel,
    ativa: Boolean(area.active),
  }
}

export async function createRiskArea(area) {
  return request('/areas-risco', { method: 'POST', body: JSON.stringify(riskAreaPayload(area)) })
}

export async function updateRiskArea(id, area) {
  return request(`/areas-risco/${id}`, { method: 'PUT', body: JSON.stringify(riskAreaPayload(area)) })
}

export async function deleteRiskArea(id) {
  return request(`/areas-risco/${id}`, { method: 'DELETE' })
}

