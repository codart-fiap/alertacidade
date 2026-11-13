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
const SHELTER_COLOR = '#1687d9'
const POINT_COLOR = '#e34e42'
const USER_COLOR = '#1769e0'

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
      id: `shelter-${i}`,
      position: toPercent(shelter),
      color: SHELTER_COLOR,
      label: shelter.name,
      iconHtml: '<span style="font-size:11px;line-height:1;">⌂</span>',
    })),
    ...areas.map((area) => ({
      id: `area-${area.id}`,
      position: toPercent(area),
      color: STATUS_COLOR[statusFromArea(area)],
      label: area.name,
      highlighted: isFocused(area.id),
    })),
    ...points.map((point) => ({
      id: `point-${point.id}`,
      position: toPercent(point),
      color: POINT_COLOR,
      label: point.name,
      iconHtml: '<span style="font-size:12px;line-height:1;">⚠</span>',
      highlighted: isFocused(point.id),
    })),
    ...(userLocation
      ? [{ id: 'user-location', position: userLocation, color: USER_COLOR, label: 'Você' }]
      : []),
  ]

  function handleMarkerClick(markerId) {
    if (markerId.startsWith('area-')) onSelectArea?.(markerId.slice('area-'.length))
    else if (markerId.startsWith('point-')) onSelectArea?.(markerId.slice('point-'.length))
    // marcadores de abrigo e "você" não são clicáveis (igual à versão anterior)
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
