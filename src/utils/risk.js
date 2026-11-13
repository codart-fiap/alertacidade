// Calculo de status de risco e abrigo mais proximo.
//
// IMPORTANTE: esse calculo esta aqui so pra sustentar a demonstracao
// do frontend enquanto nao existe API. Quando o backend existir, a
// decisao de "esta area esta em alerta" deve vir pronta da API —
// o front nao deveria precisar recalcular isso.

export function statusFromArea(area) {
  const ratio = area.value / area.threshold
  if (ratio >= 1) return 'critico'
  if (ratio >= 0.8) return 'atencao'
  return 'normal'
}

export function statusLabel(status) {
  if (status === 'critico') return 'Crítico'
  if (status === 'atencao') return 'Atenção'
  return 'Normal'
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

// dado um ponto marcado pelo usuario no mapa (coordenadas
// esquematicas, nunca GPS real), acha a area de risco mais proxima
export function nearestArea(userLocation, areas) {
  if (!userLocation || areas.length === 0) return null
  return areas.reduce((closest, area) => {
    const d = distance(userLocation.x, userLocation.y, area.x, area.y)
    const closestD = distance(userLocation.x, userLocation.y, closest.x, closest.y)
    return d < closestD ? area : closest
  })
}

// dentro dos abrigos de uma area, acha o mais proximo do usuario
export function nearestShelter(userLocation, shelters) {
  if (shelters.length === 0) return null
  if (!userLocation) return shelters[0]
  return shelters.reduce((closest, shelter) => {
    const d = distance(userLocation.x, userLocation.y, shelter.x, shelter.y)
    const closestD = distance(userLocation.x, userLocation.y, closest.x, closest.y)
    return d < closestD ? shelter : closest
  })
}
