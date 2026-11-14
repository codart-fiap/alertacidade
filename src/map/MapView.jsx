// Componente de mapa reutilizável, extraído do projeto Click Way e portado
// para JS puro (o resto do alertacidade não usa TypeScript).
//
// Usa Leaflet com `L.CRS.Simple`, tratando a imagem como um plano cartesiano
// (não um mapa geográfico com tiles — não precisa de internet/tiles externos).
// Não sabe o que é "área de risco", "abrigo" etc — só desenha imagem,
// marcadores e linhas, e reporta cliques em coordenadas percentuais
// (0-100, relativas ao tamanho da imagem). Quem decide o que cada marcador
// significa é o componente que usa este (ver ../components/SchematicMap.jsx).

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './map.css'

// Distância mínima (em pixels de tela) entre dois marcadores para que ambos
// mostrem o nome. Abaixo disso, o segundo marcador mostra só o ícone.
const MIN_LABEL_SPACING_PX = 68
const BADGE_SIZE = 28
const HIGHLIGHT_COLOR = '#ffb300'
const HIGHLIGHT_BADGE_SIZE = 36

function percentToLatLng(point, width, height) {
  // CRS.Simple trata +lat como "para cima". A imagem cresce em y para baixo,
  // então invertemos: yPct=0 (topo da imagem) vira lat=height (topo do mapa).
  const lat = height - (point.yPct / 100) * height
  const lng = (point.xPct / 100) * width
  return [lat, lng]
}

function latLngToPercent(lat, lng, width, height) {
  return {
    xPct: (lng / width) * 100,
    yPct: ((height - lat) / height) * 100,
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildMarkerIcon(marker, showLabel) {
  const color = marker.color ?? '#0b5fa5'
  const size = marker.highlighted ? HIGHLIGHT_BADGE_SIZE : BADGE_SIZE
  const border = marker.highlighted ? `3px solid ${HIGHLIGHT_COLOR}` : '2px solid #fff'
  const pulseClass = marker.highlighted ? 'map-marker-pulse' : ''

  const badge = `<div class="${pulseClass}" style="width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;border:${border};box-shadow:0 1px 4px rgba(0,0,0,0.35);">${marker.iconHtml ?? ''}</div>`

  const label =
    showLabel && marker.label
      ? `<span style="position:absolute;left:${size + 6}px;top:50%;transform:translateY(-50%);background:#fff;color:#14213d;font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.25);">${escapeHtml(marker.label)}</span>`
      : ''

  return L.divIcon({
    className: '', // sem a classe padrão do Leaflet (que traz fundo/borda quadrada)
    html: `<div style="position:relative;width:${size}px;height:${size}px;">${badge}${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/**
 * @param {{
 *   imageDataUrl: string,
 *   width: number,
 *   height: number,
 *   markers?: Array<{id:string, position:{xPct:number,yPct:number}, color?:string, label?:string, iconHtml?:string, highlighted?:boolean}>,
 *   zones?: Array<{id:string, position:{xPct:number,yPct:number}, radius:number, color?:string}>,
 *   lines?: Array<{id:string, from:{xPct:number,yPct:number}, to:{xPct:number,yPct:number}, color?:string}>,
 *   onMapClick?: (point:{xPct:number,yPct:number}) => void,
 *   onMarkerClick?: (markerId:string) => void,
 *   onLineClick?: (lineId:string) => void,
 *   heightPx?: number | string,
 * }} props
 */
function MapView({
  imageDataUrl,
  width,
  height,
  markers = [],
  zones = [],
  focusPosition,
  lines = [],
  onMapClick,
  onMarkerClick,
  onLineClick,
  heightPx = 420,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)
  const linesLayerRef = useRef(null)
  const zonesLayerRef = useRef(null)

  // Refs para os callbacks/dados "mais recentes": evita recriar o mapa ou
  // registrar handlers novos só porque quem usa o componente passou uma
  // nova referência entre renders (função inline, array novo de markers etc).
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick
  const onLineClickRef = useRef(onLineClick)
  onLineClickRef.current = onLineClick
  const markersRef = useRef(markers)
  markersRef.current = markers
  const zonesRef = useRef(zones)
  zonesRef.current = zones
  const redrawMarkersRef = useRef(() => {})

  useEffect(() => {
    if (!containerRef.current) return undefined

    const bounds = [
      [0, 0],
      [height, width],
    ]

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -3,
      maxZoom: 4,
      attributionControl: false,
      zoomControl: true,
    })

    // Put risk overlays in a dedicated pane between the map image and
    // marker icons so the image can never cover the monitored areas.
    const riskPane = map.createPane('riskZones')
    riskPane.style.zIndex = '550'

    L.imageOverlay(imageDataUrl, bounds).addTo(map)
    map.fitBounds(bounds)

    // O container pode mudar de tamanho depois do mount (ex: o CSS do app
    // usa aspect-ratio responsivo, troca em media query, rotação de tela).
    // O Leaflet não percebe isso sozinho — sem isso o mapa fica com o
    // tamanho/posição desatualizados até o próximo zoom manual.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(containerRef.current)

    map.on('click', (event) => {
      const point = latLngToPercent(event.latlng.lat, event.latlng.lng, width, height)
      onMapClickRef.current?.(point)
    })

    const markersLayer = L.layerGroup().addTo(map)
    markersLayerRef.current = markersLayer
    const linesLayer = L.layerGroup().addTo(map)
    linesLayerRef.current = linesLayer
    const zonesLayer = L.layerGroup().addTo(map)
    zonesLayerRef.current = zonesLayer
    mapRef.current = map

    // Redesenha todos os marcadores, decidindo (por proximidade em pixels de
    // tela) quais mostram o nome. Reexecutado a cada zoom/arraste, porque a
    // distância em pixels entre dois pontos do mapa muda com o zoom.
    function redrawMarkers() {
      const zonesLayer = zonesLayerRef.current
      if (zonesLayer) {
        zonesLayer.clearLayers()
        zonesRef.current.forEach((zone) => {
          const center = percentToLatLng(zone.position, width, height)
          const mapRadius = Math.min(width, height) * (zone.radius / 100)
          const centerPoint = map.latLngToLayerPoint(center)
          const radiusPoint = map.latLngToLayerPoint([center[0], center[1] + mapRadius])
          const screenRadius = Math.max(8, centerPoint.distanceTo(radiusPoint))
          const diameter = Math.round(screenRadius * 2)
          const color = zone.color ?? '#ff5a5a'
          const zoneIcon = L.divIcon({
            className: 'risk-zone-marker',
            html: `<div class="risk-zone-area" style="--risk-zone-color:${color};--risk-zone-fill:${color}40;--risk-zone-border:${color}b3;width:${diameter}px;height:${diameter}px;"></div>`,
            iconSize: [diameter, diameter],
            iconAnchor: [screenRadius, screenRadius],
          })
          L.marker(center, {
            icon: zoneIcon,
            pane: 'riskZones',
            interactive: false,
            keyboard: false,
          }).addTo(zonesLayer)
        })
      }

      const layer = markersLayerRef.current
      if (!layer) return
      layer.clearLayers()

      const placedLabelPoints = []

      markersRef.current.forEach((marker) => {
        const latLng = percentToLatLng(marker.position, width, height)
        const screenPoint = map.latLngToContainerPoint(latLng)

        let showLabel = Boolean(marker.label)
        if (showLabel) {
          const collides = placedLabelPoints.some(
            (placed) => placed.distanceTo(screenPoint) < MIN_LABEL_SPACING_PX,
          )
          if (collides) showLabel = false
        }
        if (showLabel) placedLabelPoints.push(screenPoint)

        const markerLayer = L.marker(latLng, {
          icon: buildMarkerIcon(marker, showLabel),
          zIndexOffset: marker.highlighted ? 1000 : 0,
        })
        markerLayer.on('click', (event) => {
          L.DomEvent.stopPropagation(event)
          onMarkerClickRef.current?.(marker.id)
        })
        markerLayer.addTo(layer)
      })
    }

    redrawMarkersRef.current = redrawMarkers
    redrawMarkers()
    map.on('zoomend moveend', redrawMarkers)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
      linesLayerRef.current = null
      zonesLayerRef.current = null
    }
  }, [imageDataUrl, width, height])

  useEffect(() => {
    const layer = linesLayerRef.current
    if (!layer) return
    layer.clearLayers()
    lines.forEach((line) => {
      const fromLatLng = percentToLatLng(line.from, width, height)
      const toLatLng = percentToLatLng(line.to, width, height)
      const polyline = L.polyline([fromLatLng, toLatLng], {
        color: line.color ?? '#475569',
        weight: 4,
        opacity: 0.85,
      })
      polyline.on('click', (event) => {
        L.DomEvent.stopPropagation(event)
        onLineClickRef.current?.(line.id)
      })
      polyline.addTo(layer)
    })
  }, [lines, width, height])

  useEffect(() => {
    redrawMarkersRef.current()
  }, [markers, zones])

  useEffect(() => {
    if (!focusPosition || !mapRef.current) return
    const target = percentToLatLng(focusPosition, width, height)
    const map = mapRef.current
    map.flyTo(target, Math.max(map.getZoom(), 1), { duration: 0.65 })
  }, [focusPosition?.xPct, focusPosition?.yPct, width, height])

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Mapa"
      style={{
        width: '100%',
        height: heightPx,
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#dce8dc',
      }}
    />
  )
}

export default MapView
