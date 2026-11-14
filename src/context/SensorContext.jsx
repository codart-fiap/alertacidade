import { createContext, useContext, useState } from 'react'
import { useSensorSimulation } from '../hooks/useSensorSimulation.js'
import { mockAreas, mockShelters } from '../services/mockData.js'

const SensorContext = createContext(null)

// O estado dos sensores (areas + alertas) precisa ser o mesmo em
// qualquer tela — a lista, o mapa e o painel do gestor tem que
// mostrar os mesmos dados. Por isso o hook useSensorSimulation roda
// uma unica vez aqui no topo da aplicacao, e cada pagina so consome
// via useSensors(), em vez de cada uma chamar o hook por conta
// propria (o que criaria estados duplicados e desincronizados).
export function SensorProvider({ children }) {
  const simulation = useSensorSimulation(mockAreas)
  const [shelters, setShelters] = useState(() => mockShelters.map((shelter, index) => ({ ...shelter, id: shelter.id ?? `shelter-${index + 1}` })))
  const [publicPoints, setPublicPoints] = useState([])
  const [mapImage, setMapImage] = useState(() => localStorage.getItem('alertacidade-map-image') || '')
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
    const id = `p${Date.now()}`
    const area = { id, name: point.name, type: point.type, sensor: '', value: 0, threshold: 1, unit: '', x: point.x ?? 0.5, y: point.y ?? 0.5 }
    setPublicPoints((current) => [{ ...area, instruction: point.instruction }, ...current])
    simulation.addManualAlert(id)
  }
  function updatePublicPoint(id, updates) { setPublicPoints((current) => current.map((point) => point.id === id ? { ...point, ...updates } : point)) }
  function removePublicPoint(id) {
    setPublicPoints((current) => current.filter((point) => point.id !== id))
    simulation.alerts.filter((alert) => String(alert.areaId) === String(id) && !alert.resolved).forEach((alert) => simulation.resolveAlertLocally(alert.id))
  }
  return <SensorContext.Provider value={{ ...simulation, shelters, addShelter, updateShelter, removeShelter, publicPoints, addPublicPoint, updatePublicPoint, removePublicPoint, mapImage, updateMapImage }}>
    {children}
  </SensorContext.Provider>
}

export function useSensors() {
  const ctx = useContext(SensorContext)
  if (!ctx) throw new Error('useSensors precisa ser usado dentro de um SensorProvider.')
  return ctx
}
