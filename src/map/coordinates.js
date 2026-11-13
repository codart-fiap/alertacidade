// Conversões de coordenadas pixel <-> percentual. Funções puras, sem
// dependência de React/Leaflet. Extraídas do módulo de mapa do Click Way.

export function pixelToPercent(xPx, yPx, width, height) {
  return {
    xPct: (xPx / width) * 100,
    yPct: (yPx / height) * 100,
  }
}

export function percentToPixel(point, width, height) {
  return {
    x: (point.xPct / 100) * width,
    y: (point.yPct / 100) * height,
  }
}
