// SchematicMap — ADAPTADOR.
//
// Mantém exatamente a mesma API de props que a versão anterior (SVG feito à
// mão), mas renderiza usando o MapView extraído do projeto Click Way
// (Leaflet + L.CRS.Simple). Nenhuma outra tela precisou mudar: MapPage,
// AdminAlertsPage e AreasListPage continuam chamando <SchematicMap ... />
// exatamente como antes.
//
// O que isso ganha na troca:
// - zoom e arraste de verdade (pinça no touch, scroll do mouse, inércia),
//   em vez de um zoom/pan caseiro;
// - a imagem do mapa não fica mais esticada/distorcida num box fixo de
//   1000x600 — o Leaflet respeita a proporção real da imagem enviada;
// - colisão de rótulos já pronta (dois marcadores próximos não escrevem
//   nome em cima um do outro).
//
// O que foi preservado de propósito (pra não quebrar nada que as outras
// telas dependem):
// - mesmo sistema de coordenadas dos dados existentes: x,y <= 1 é fração
//   (0-1) da imagem; x,y > 1 é a escala "esquemática" antiga (grade
//   400x240) usada em mockData.js — ver `toPercent()` abaixo;
// - onPickLocation/onLocationChange continuam emitindo {x, y} em fração
//   0-1, do jeito que AdminAlertsPage e AreasListPage já esperam;
// - onSelectArea continua recebendo o id original (área ou ponto público).

import { useEffect, useState } from 'react'
import MapView from '../map/MapView.jsx'
import { loadAndCompressImage, getImageDimensions } from '../map/image.js'
import { statusFromArea } from '../utils/risk.js'

const STATUS_COLOR = { normal: '#2ecf85', atencao: '#e6b23d', critico: '#ff5a5a' }
const SHELTER_COLOR = '#16a34a'
const POINT_COLOR = '#ea580c'
const USER_COLOR = '#2563eb'
const SENSOR_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 3v3m6-3v3m3 6h3m-3 4h3M3 9h3m-3 6h3m3 6v-3m6 3v-3"/><circle cx="12" cy="12" r="2.3"/></svg>'
const ATTENTION_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 22 20H2L12 3Z"/><path d="M12 9v5m0 3h.01"/></svg>'
const SHELTER_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 11 9-8 9 8v10H3V11Z"/><path d="M9 21v-7h6v7"/></svg>'
const USER_LOCATION_ICON = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-5.7 7-12a7 7 0 1 0-14 0c0 6.3 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/><path d="M8.5 15c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4"/></svg>'

// Grade "esquemática" antiga (ver mockData.js) usada quando x/y não é uma
// fração 0-1. Mantém compatibilidade com os dados de exemplo sem precisar
// migrar nada.
const LEGACY_GRID_WIDTH = 400
const LEGACY_GRID_HEIGHT = 240

function toPercent(item) {
  const xPct = item.x <= 1 ? item.x * 100 : (item.x / LEGACY_GRID_WIDTH) * 100
  const yPct = item.y <= 1 ? item.y * 100 : (item.y / LEGACY_GRID_HEIGHT) * 100
  return { xPct, yPct }
}

// Usado só quando ainda não existe imagem de mapa cadastrada — mesma
// mensagem que a versão anterior mostrava, agora como uma imagem de
// verdade (o MapView sempre precisa de uma imagem pra desenhar o fundo).
const PLACEHOLDER_WIDTH = 1000
const PLACEHOLDER_HEIGHT = 600
const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${PLACEHOLDER_WIDTH}" height="${PLACEHOLDER_HEIGHT}">
    <rect width="100%" height="100%" fill="#dce8dc" />
    <path d="M0 140 L1000 510 M-40 530 L760 0 M330 0 L690 600 M0 340 L1000 250" stroke="#f8f6ef" stroke-width="48" />
    <path d="M0 140 L1000 510 M-40 530 L760 0 M330 0 L690 600 M0 340 L1000 250" stroke="#c5d1c8" stroke-width="3" />
    <path d="M90 0 Q150 160 80 600 M820 0 Q750 220 920 600" stroke="#9ec9d0" stroke-width="35" fill="none" />
    <text x="500" y="320" text-anchor="middle" fill="#68786c" font-size="24" font-family="sans-serif">Adicione uma imagem de mapa no painel do gestor</text>
  </svg>
`)}`

export default function SchematicMap({
  areas = [],
  shelters = [],
  focusAreaId,
  onSelectArea,
  onSelectSensor,
  onSelectShelter,
  points = [],
  image,
  onImageChange,
  onPickLocation,
  pickingLabel,
  onLocationChange,
}) {
  const [userLocation, setUserLocation] = useState(null)
  const [picking, setPicking] = useState(false)
  const [imageMeta, setImageMeta] = useState(null) // {width, height} da imagem real
  const isManagerPicking = Boolean(onPickLocation)

  // A versão anterior não precisava saber a dimensão real da imagem (ela
  // esticava qualquer imagem pra caber num box fixo). O MapView precisa,
  // pra não distorcer. Quando `image` muda, descobrimos as dimensões reais
  // uma vez e guardamos — evita recalcular a cada render.
  useEffect(() => {
    let cancelled = false
    if (!image) {
      setImageMeta(null)
      return undefined
    }
    getImageDimensions(image)
      .then((meta) => { if (!cancelled) setImageMeta(meta) })
      .catch(() => { if (!cancelled) setImageMeta(null) })
    return () => { cancelled = true }
  }, [image])

  const activeImage = image || PLACEHOLDER_IMAGE
  const activeWidth = image && imageMeta ? imageMeta.width : PLACEHOLDER_WIDTH
  const activeHeight = image && imageMeta ? imageMeta.height : PLACEHOLDER_HEIGHT
  // Enquanto a imagem recém-trocada ainda não teve suas dimensões lidas,
  // evita desenhar com a imagem nova + dimensões antigas (um frame torto).
  const readyToRender = !image || Boolean(imageMeta)

  function isFocused(id) {
    return focusAreaId != null && String(focusAreaId) === String(id)
  }

  const markers = [
    ...shelters.map((shelter, i) => ({
      id: `shelter-${shelter.id ?? i}`,
      position: toPercent(shelter),
      color: SHELTER_COLOR,
      label: shelter.name,
      iconHtml: SHELTER_ICON,
    })),
    ...areas.map((area) => ({
      id: `area-${area.id}`,
      position: toPercent(area),
      color: area.active === false ? '#858b93' : STATUS_COLOR[statusFromArea(area)],
      label: area.name,
      iconHtml: area.active === false ? '<span style="font-size:15px;line-height:1;">×</span>' : SENSOR_ICON,
      highlighted: isFocused(area.id),
    })),
    ...points.map((point) => ({
      id: `point-${point.id}`,
      position: toPercent(point),
      color: POINT_COLOR,
      label: point.name,
      iconHtml: ATTENTION_ICON,
      highlighted: isFocused(point.id),
    })),
    ...(userLocation
      ? [{ id: 'user-location', position: userLocation, color: USER_COLOR, label: 'Você', iconHtml: USER_LOCATION_ICON }]
      : []),
  ]
  const zones = areas.filter((area) => area.active !== false).map((area) => {
    const ratio = Number(area.value) / Number(area.threshold)
    const boundedRatio = Number.isFinite(ratio) ? Math.max(0, Math.min(ratio, 2.4)) : 0
    return {
      id: `risk-zone-${area.id}`,
      position: toPercent(area),
      radius: Math.max(4, Math.min(22, 3 + boundedRatio * 8)),
      color: STATUS_COLOR[statusFromArea(area)],
    }
  })
  const focusedItem = [...areas, ...points].find((item) => isFocused(item.id))
  const focusPosition = focusedItem ? toPercent(focusedItem) : null

  function handleMarkerClick(markerId) {
    if (isManagerPicking) {
      const marker = markers.find((item) => item.id === markerId)
      if (marker) onPickLocation({ x: marker.position.xPct / 100, y: marker.position.yPct / 100 })
      return
    }
    if (markerId.startsWith('area-')) (onSelectSensor || onSelectArea)?.(markerId.slice('area-'.length))
    else if (markerId.startsWith('point-')) onSelectArea?.(markerId.slice('point-'.length))
    else if (markerId.startsWith('shelter-')) onSelectShelter?.(markerId.slice('shelter-'.length))
  }

  function handleMapClick(point) {
    const fraction = { x: point.xPct / 100, y: point.yPct / 100 }
    if (isManagerPicking) {
      onPickLocation(fraction)
      return
    }
    if (picking) {
      setUserLocation(point)
      onLocationChange?.(fraction)
      setPicking(false)
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    const { dataUrl, width, height } = await loadAndCompressImage(file)
    setImageMeta({ width, height })
    onImageChange?.(dataUrl)
  }

  return (
    <div className="map-shell">
      <div className="map-stage">
        {readyToRender && (
          <MapView
            imageDataUrl={activeImage}
            width={activeWidth}
            height={activeHeight}
            markers={markers}
            zones={zones}
            focusPosition={focusPosition}
            onMapClick={handleMapClick}
            onMarkerClick={handleMarkerClick}
            heightPx="100%"
          />
        )}
        {onImageChange && (
          <label className="map-upload">
            ▧ Trocar imagem
            <input type="file" accept="image/*" onChange={handleUpload} />
          </label>
        )}
        <div className="map-legend" aria-label="Legenda dos marcadores do mapa">
          <span><i className="map-legend-icon sensor" dangerouslySetInnerHTML={{ __html: SENSOR_ICON }} />Sensor · risco</span>
          <span><i className="map-legend-icon shelter" dangerouslySetInnerHTML={{ __html: SHELTER_ICON }} />Abrigo</span>
          <span><i className="map-legend-icon attention" dangerouslySetInnerHTML={{ __html: ATTENTION_ICON }} />Ponto de atenção</span>
          <span><i className="map-legend-area" />Área monitorada</span>
          {!onImageChange && <span><i className="map-legend-icon user" dangerouslySetInnerHTML={{ __html: USER_LOCATION_ICON }} />Sua localização</span>}
        </div>
        {isManagerPicking && (
          <div className="map-pick-hint">{pickingLabel || 'Toque no mapa para marcar o ponto'}</div>
        )}
        {!isManagerPicking && picking && (
          <div className="map-pick-hint">Toque no mapa para marcar sua localização</div>
        )}
      </div>
      {!isManagerPicking && (
        <button
          className="btn secondary"
          style={{ marginTop: 10, width: '100%' }}
          onClick={() => setPicking((current) => !current)}
        >
          {picking ? 'Toque no mapa para marcar' : userLocation ? '📍 Atualizar minha localização' : '📍 Simular minha localização'}
        </button>
      )}
      <p className="map-caption">Arraste para mover · use os botões ou a roda do mouse para aproximar</p>
    </div>
  )
}
