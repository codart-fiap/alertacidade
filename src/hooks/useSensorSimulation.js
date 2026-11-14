import { useEffect, useState, useRef } from 'react'
import { postLeitura } from '../services/apiClient.js'
import { statusFromArea } from '../utils/risk.js'

// Simula sensores gerando leituras periodicas pra cada area de risco.
// Isso cobre a parte 6 do documento (Simulacao de IoT) enquanto nao
// existe hardware real nem API — cada leitura simulada ja tenta ser
// enviada via postLeitura(), que hoje nao faz nada real (ver
// apiClient.js) mas vai passar a enviar pra API assim que ela existir.
//
// Recebe a lista inicial de areas e devolve o estado atualizado +
// a lista de alertas ativos, pra qualquer tela usar.
export function useSensorSimulation(initialAreas) {
  const [areas, setAreas] = useState(() => initialAreas.map((area) => ({ ...area, active: area.active ?? true })))
  const [alerts, setAlerts] = useState([])
  const alertIdRef = useRef(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setAreas((current) => {
        const activeIndexes = current.reduce((indexes, area, index) => area.active === false ? indexes : [...indexes, index], [])
        if (!activeIndexes.length) return current
        const index = activeIndexes[Math.floor(Math.random() * activeIndexes.length)]
        const area = current[index]
        const spike = Math.random() < 0.25

        let delta
        if (area.unit === '°C') delta = spike ? Math.random() * 4 + 2 : Math.random() * 2 - 1
        else if (area.unit === '%') delta = spike ? Math.random() * 18 + 8 : Math.random() * 6 - 3
        else delta = spike ? Math.random() * 0.5 + 0.3 : Math.random() * 0.2 - 0.08

        const newValue = Math.max(0, +(area.value + delta).toFixed(2))
        const updatedArea = { ...area, value: newValue }

        postLeitura(area.id, newValue)

        const updated = [...current]
        updated[index] = updatedArea

        // atualiza alertas com base no novo status
        setAlerts((currentAlerts) => {
          const status = statusFromArea(updatedArea)
          const activeAlert = currentAlerts.find((a) => a.areaId === updatedArea.id && !a.resolved)

          if (status === 'critico' && !activeAlert) {
            return [
              { id: alertIdRef.current++, areaId: updatedArea.id, time: new Date().toLocaleTimeString('pt-BR'), value: newValue, instruction: updatedArea.instruction || '', resolved: false },
              ...currentAlerts,
            ]
          }
          if (status !== 'critico' && activeAlert) {
            return currentAlerts.map((a) => (a.id === activeAlert.id ? { ...a, resolved: true } : a))
          }
          return currentAlerts
        })

        return updated
      })
    }, 2800)

    return () => clearInterval(interval)
  }, [])

  function resolveAlertLocally(alertId) {
    setAlerts((current) => current.map((a) => (a.id === alertId ? { ...a, resolved: true } : a)))
  }

  function addManualAlert(areaId) {
    setAlerts((current) => [{ id: `manual-${Date.now()}`, areaId, time: new Date().toLocaleTimeString('pt-BR'), value: null, resolved: false }, ...current])
  }

  function updateAlert(alertId, updates) {
    setAlerts((current) => current.map((alert) => String(alert.id) === String(alertId) ? { ...alert, ...updates } : alert))
  }

  function removeAlert(alertId) {
    setAlerts((current) => current.filter((alert) => String(alert.id) !== String(alertId)))
  }

  function updateAreaInstruction(areaId, instruction) {
    setAreas((current) => current.map((area) => String(area.id) === String(areaId) ? { ...area, instruction } : area))
  }

  function addSensor(sensor) {
    const id = `sensor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setAreas((current) => [...current, { ...sensor, id, value: Number(sensor.value ?? 0), threshold: Number(sensor.threshold), active: sensor.active ?? true }])
    return id
  }

  function updateSensor(sensorId, updates) {
    setAreas((current) => current.map((area) => String(area.id) === String(sensorId) ? { ...area, ...updates, value: Number(updates.value ?? area.value), threshold: Number(updates.threshold ?? area.threshold) } : area))
    if (updates.active === false) {
      setAlerts((current) => current.map((alert) => String(alert.areaId) === String(sensorId) ? { ...alert, resolved: true } : alert))
    }
  }

  function removeSensor(sensorId) {
    setAreas((current) => current.filter((area) => String(area.id) !== String(sensorId)))
    setAlerts((current) => current.filter((alert) => String(alert.areaId) !== String(sensorId)))
  }

  return { areas, alerts, resolveAlertLocally, addManualAlert, updateAlert, removeAlert, updateAreaInstruction, addSensor, updateSensor, removeSensor }
}
