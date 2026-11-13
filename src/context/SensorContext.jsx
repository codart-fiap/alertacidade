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
  const [shelters, setShelters] = useState(mockShelters)
  const [publicPoints, setPublicPoints] = useState([])
  const [mapImage, setMapImage] = useState(() => localStorage.getItem('alertacidade-map-image') || '')
  function updateMapImage(image) {
    setMapImage(image)
    if (image) localStorage.setItem('alertacidade-map-image', image)
    else localStorage.removeItem('alertacidade-map-image')
  }
  function addShelter(shelter) { setShelters((current) => [...current, { ...shelter, areaId: 0, x: shelter.x ?? 0.5, y: shelter.y ?? 0.5 }]) }
  function addPublicPoint(point) {
    const id = `p${Date.now()}`
    const area = { id, name: point.name, type: point.type, sensor: '', value: 0, threshold: 1, unit: '', x: point.x ?? 0.5, y: point.y ?? 0.5 }
    setPublicPoints((current) => [{ ...area, instruction: point.instruction }, ...current])
    simulation.addManualAlert(id)
  }
  return <SensorContext.Provider value={{ ...simulation, shelters, addShelter, publicPoints, addPublicPoint, mapImage, updateMapImage }}>
    {children}
  </SensorContext.Provider>
}

export function useSensors() {
  const ctx = useContext(SensorContext)
  if (!ctx) throw new Error('useSensors precisa ser usado dentro de um SensorProvider.')
  return ctx
}
