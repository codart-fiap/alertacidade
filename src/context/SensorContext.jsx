import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useSensorSimulation } from '../hooks/useSensorSimulation.js'
import { mockAreas, mockShelters } from '../services/mockData.js'
import { getDashboardData, hasRealApi, setRiskAreaActive } from '../services/apiClient.js'

const SensorContext = createContext(null)
const MANAGER_NOTIFICATIONS_KEY = 'alertacidade-manager-notifications'
const PUBLIC_POINTS_KEY = 'alertacidade-public-points'
const CITIZEN_REPORTS_KEY = 'alertacidade-citizen-reports'

function readStoredArray(key, value = localStorage.getItem(key)) {
  try {
    const parsed = value ? JSON.parse(value) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// O estado dos sensores (areas + alertas) precisa ser o mesmo em
// qualquer tela — a lista, o mapa e o painel do gestor tem que
// mostrar os mesmos dados. Por isso o hook useSensorSimulation roda
// uma unica vez aqui no topo da aplicacao, e cada pagina so consome
// via useSensors(), em vez de cada uma chamar o hook por conta
// propria (o que criaria estados duplicados e desincronizados).
export function SensorProvider({ children }) {
  const simulation = useSensorSimulation(mockAreas)
  const [apiAreas, setApiAreas] = useState(() => hasRealApi ? [] : mockAreas)
  const [apiSensors, setApiSensors] = useState([])
  const [apiAlerts, setApiAlerts] = useState([])
  const [apiShelters, setApiShelters] = useState(() => hasRealApi ? [] : mockShelters.map((shelter, index) => ({ ...shelter, id: shelter.id ?? `shelter-${index + 1}` })))
  const [loading, setLoading] = useState(hasRealApi)
  const [apiError, setApiError] = useState('')
  const areas = hasRealApi ? apiAreas : simulation.areas
  const sensors = hasRealApi ? apiSensors : simulation.areas.map((area) => ({ ...area, areaId: area.id, areaName: area.name }))
  const alerts = hasRealApi ? apiAlerts : simulation.alerts
  const shelters = apiShelters
  const [publicPoints, setPublicPoints] = useState(() => readStoredArray(PUBLIC_POINTS_KEY))
  const publicPointsRef = useRef(publicPoints)
  const [citizenReports, setCitizenReports] = useState(() => readStoredArray(CITIZEN_REPORTS_KEY))
  const citizenReportsRef = useRef(citizenReports)
  const [managerNotifications, setManagerNotifications] = useState(() => readStoredArray(MANAGER_NOTIFICATIONS_KEY))
  const managerNotificationsRef = useRef(managerNotifications)
  const [mapImage, setMapImage] = useState(() => localStorage.getItem('alertacidade-map-image') || '')
  useEffect(() => {
    if (!hasRealApi) return undefined
    let disposed = false
    let refreshing = false
    async function refresh() {
      if (disposed || refreshing || document.hidden) return
      refreshing = true
      try {
        const data = await getDashboardData()
        if (disposed) return
        setApiAreas(data.areas)
        setApiSensors(data.sensors)
        setApiAlerts(data.alerts)
        setApiShelters(data.shelters)
        setApiError('')
      } catch (error) {
        if (!disposed) setApiError(error.message)
      } finally {
        if (!disposed) setLoading(false)
        refreshing = false
      }
    }
    refresh()
    const interval = window.setInterval(refresh, 5000)
    const handleVisibility = () => { if (!document.hidden) refresh() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      disposed = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])
  useEffect(() => {
    function syncNotifications(event) {
      if (event.key === null || event.key === MANAGER_NOTIFICATIONS_KEY) {
        const next = readStoredArray(MANAGER_NOTIFICATIONS_KEY, event.key === null ? null : event.newValue)
        managerNotificationsRef.current = next
        setManagerNotifications(next)
      }
      if (event.key === null || event.key === PUBLIC_POINTS_KEY) {
        const next = readStoredArray(PUBLIC_POINTS_KEY, event.key === null ? null : event.newValue)
        publicPointsRef.current = next
        setPublicPoints(next)
      }
      if (event.key === null || event.key === CITIZEN_REPORTS_KEY) {
        const next = readStoredArray(CITIZEN_REPORTS_KEY, event.key === null ? null : event.newValue)
        citizenReportsRef.current = next
        setCitizenReports(next)
      }
    }
    window.addEventListener('storage', syncNotifications)
    return () => window.removeEventListener('storage', syncNotifications)
  }, [])

  function commitManagerNotifications(next) {
    managerNotificationsRef.current = next
    setManagerNotifications(next)
    try { localStorage.setItem(MANAGER_NOTIFICATIONS_KEY, JSON.stringify(next)) } catch { /* State remains available in this tab if storage is unavailable. */ }
  }
  function commitPublicPoints(next) {
    publicPointsRef.current = next
    setPublicPoints(next)
    try { localStorage.setItem(PUBLIC_POINTS_KEY, JSON.stringify(next)) } catch { /* State remains available in this tab if storage is unavailable. */ }
  }
  function commitCitizenReports(next) {
    citizenReportsRef.current = next
    setCitizenReports(next)
    try { localStorage.setItem(CITIZEN_REPORTS_KEY, JSON.stringify(next)) } catch { /* State remains available in this tab if storage is unavailable. */ }
  }
  function updateMapImage(image) {
    setMapImage(image)
    if (image) localStorage.setItem('alertacidade-map-image', image)
    else localStorage.removeItem('alertacidade-map-image')
  }
  function addShelter(shelter) {
    const id = `shelter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setShelters((current) => [...current, { ...shelter, id, areaId: 0, x: shelter.x ?? 0.5, y: shelter.y ?? 0.5 }])
  }
  function updateShelter(id, updates) { setShelters((current) => current.map((shelter) => shelter.id === id ? { ...shelter, ...updates } : shelter)) }
  function removeShelter(id) { setShelters((current) => current.filter((shelter) => shelter.id !== id)) }
  function addPublicPoint(point) {
    const id = `p${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const area = { id, name: point.name, type: point.type, sensor: '', value: 0, threshold: 1, unit: '', x: point.x ?? 0.5, y: point.y ?? 0.5 }
    commitPublicPoints([{ ...area, instruction: point.instruction }, ...publicPointsRef.current])
    simulation.addManualAlert(id)
    return id
  }
  function updatePublicPoint(id, updates) { commitPublicPoints(publicPointsRef.current.map((point) => point.id === id ? { ...point, ...updates } : point)) }
  function removePublicPoint(id) {
    commitPublicPoints(publicPointsRef.current.filter((point) => String(point.id) !== String(id)))
    simulation.alerts.filter((alert) => String(alert.areaId) === String(id) && !alert.resolved).forEach((alert) => simulation.resolveAlertLocally(alert.id))
  }
  function submitCitizenReport(report) {
    const id = `report-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const item = { ...report, id, status: 'pending', confirmations: [], createdAt: new Date().toISOString() }
    commitCitizenReports([item, ...citizenReportsRef.current])
    return id
  }
  function confirmCitizenReport(reportId, citizenId) {
    const report = citizenReportsRef.current.find((item) => item.id === reportId)
    if (!report || report.status !== 'pending' || report.reporterId === citizenId || (report.confirmations || []).includes(citizenId)) return false
    const confirmations = [...(report.confirmations || []), citizenId]
    const publicPointId = addPublicPoint(report)
    commitCitizenReports(citizenReportsRef.current.map((item) => item.id === reportId ? { ...item, confirmations, status: 'confirmed', publicPointId, confirmedAt: new Date().toISOString() } : item))
    return true
  }
  function addManagerNotification(notification) {
    const id = `notice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    commitManagerNotifications([{ ...notification, id, active: true, createdAt: new Date().toISOString() }, ...managerNotificationsRef.current])
    return id
  }
  function updateManagerNotification(id, updates) {
    commitManagerNotifications(managerNotificationsRef.current.map((notification) => notification.id === id ? { ...notification, ...updates } : notification))
  }
  function removeManagerNotification(id) {
    commitManagerNotifications(managerNotificationsRef.current.filter((notification) => notification.id !== id))
  }
  async function deactivateRiskArea(areaId) {
    if (!hasRealApi) {
      simulation.alerts.filter((alert) => String(alert.areaId) === String(areaId) && !alert.resolved).forEach((alert) => simulation.resolveAlertLocally(alert.id))
      return
    }
    const area = apiAreas.find((item) => String(item.id) === String(areaId))
    if (!area) throw new Error('Área de risco não encontrada.')
    await setRiskAreaActive(area, false)
    const data = await getDashboardData()
    setApiAreas(data.areas)
    setApiSensors(data.sensors)
    setApiAlerts(data.alerts)
    setApiShelters(data.shelters)
  }
  return <SensorContext.Provider value={{ ...simulation, areas, sensors, alerts, shelters, loading, apiError, apiMode: hasRealApi, deactivateRiskArea, addShelter, updateShelter, removeShelter, publicPoints, addPublicPoint, updatePublicPoint, removePublicPoint, citizenReports, submitCitizenReport, confirmCitizenReport, managerNotifications, addManagerNotification, updateManagerNotification, removeManagerNotification, mapImage, updateMapImage }}>
    {children}
  </SensorContext.Provider>
}

export function useSensors() {
  const ctx = useContext(SensorContext)
  if (!ctx) throw new Error('useSensors precisa ser usado dentro de um SensorProvider.')
  return ctx
}
