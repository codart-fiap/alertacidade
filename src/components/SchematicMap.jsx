import { useEffect, useRef, useState } from 'react'
import { statusFromArea } from '../utils/risk.js'

const STATUS_COLOR = { normal: '#2ecf85', atencao: '#e6b23d', critico: '#ff5a5a' }

function placeLabels(items, viewWidth, zoom, pan) {
  const unit = 1000 / viewWidth
  const fontPx = Math.max(9, Math.min(14, viewWidth * 0.035)) * zoom
  const gap = unit * zoom
  const markerZoom = 1 / Math.sqrt(zoom)
  const used = []
  const project = (item) => ({
    x: (item.x - 500) * zoom + 500 + pan.x,
    y: (item.y - 300) * zoom + 300 + pan.y,
  })
  const markers = items.map((item) => ({ id: item.id, ...project(item) }))
  const candidates = [
    (x, y, w) => [x, y - 19 * gap],
    (x, y) => [x, y + 29 * gap],
    (x, y, w) => [x - w / 2 - 17 * gap, y + 4 * gap],
    (x, y, w) => [x + w / 2 + 17 * gap, y + 4 * gap],
    (x, y, w) => [x + w / 2, y - 31 * gap],
    (x, y, w) => [x - w / 2, y + 42 * gap],
  ]

  return items.map((item) => {
    const marker = project(item)
    const width = Math.min(viewWidth * 0.48, item.name.length * fontPx * 0.57 + 10) * unit
    const font = Math.min(fontPx, (viewWidth * 0.48) / (item.name.length * 0.57)) * unit
    for (const candidate of candidates) {
      const [x, y] = candidate(marker.x, marker.y, width)
      const box = { left: x - width / 2, right: x + width / 2, top: y - font, bottom: y + 3 * unit }
      const inside = box.left > 3 * unit && box.right < 1000 - 3 * unit && box.top > 3 * unit && box.bottom < 600 - 3 * unit
      const overlapsText = used.some((other) => box.left < other.right + 4 * gap && box.right + 4 * gap > other.left && box.top < other.bottom + 3 * gap && box.bottom + 3 * gap > other.top)
      const overlapsMarker = markers.some((other) => other.id !== item.id && box.left < other.x + 14 * unit * markerZoom && box.right > other.x - 14 * unit * markerZoom && box.top < other.y + 14 * unit * markerZoom && box.bottom > other.y - 14 * unit * markerZoom)
      const overlapsControls = box.right > 1000 - 68 * unit && box.bottom > 600 - 132 * unit
      if (inside && !overlapsText && !overlapsMarker && !overlapsControls) {
        used.push(box)
        return { ...item, labelX: (x - 500 - pan.x) / zoom + 500, labelY: (y - 300 - pan.y) / zoom + 300, fontSize: font / zoom }
      }
    }
    return { ...item, hidden: true }
  })
}

// Mapa ilustrado pelo gestor: os pontos usam posições relativas à imagem,
// então continuam no mesmo lugar ao redimensionar, arrastar ou aproximar.
export default function SchematicMap({ areas = [], shelters = [], focusAreaId, onSelectArea, points = [], image, onImageChange, onPickLocation, pickingLabel }) {
  const svgRef = useRef(null)
  const mapGroupRef = useRef(null)
  const dragRef = useRef(null)
  const [userLocation, setUserLocation] = useState(null)
  const [picking, setPicking] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [viewWidth, setViewWidth] = useState(1000)
  const isManagerPicking = Boolean(onPickLocation)
  const sizeScale = 1000 / viewWidth
  const markerScale = sizeScale / (zoom * Math.sqrt(zoom))
  const labelItems = placeLabels([
    ...points.map((item) => ({ ...normalized(item), id: `point-${item.id}`, targetId: item.id, name: item.name, kind: 'point' })),
    ...shelters.map((item, i) => ({ ...normalized(item), id: `shelter-${i}`, name: item.name, kind: 'shelter' })),
    ...areas.map((item) => ({ ...normalized(item), id: `area-${item.id}`, targetId: item.id, name: item.name, kind: 'area' })),
    ...(userLocation ? [{ ...userLocation, id: 'user-location', name: 'Você', kind: 'user' }] : []),
  ], viewWidth, zoom, pan)
  const hiddenLabels = labelItems.filter((item) => item.hidden && item.kind !== 'user')

  useEffect(() => {
    if (!svgRef.current) return undefined
    const observer = new ResizeObserver(([entry]) => setViewWidth(entry.contentRect.width || 1000))
    observer.observe(svgRef.current)
    return () => observer.disconnect()
  }, [])

  function pointFromEvent(e) {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY
    const pos = pt.matrixTransform(mapGroupRef.current.getScreenCTM().inverse())
    return { x: Math.max(0, Math.min(1000, pos.x)), y: Math.max(0, Math.min(600, pos.y)) }
  }
  function handlePointerDown(e) {
    if (picking || isManagerPicking) return
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function handlePointerMove(e) {
    if (!dragRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    setPan({ x: dragRef.current.panX + (e.clientX - dragRef.current.x) * 1000 / rect.width / zoom, y: dragRef.current.panY + (e.clientY - dragRef.current.y) * 600 / rect.height / zoom })
  }
  function handlePointerUp() { dragRef.current = null }
  function handleMapClick(e) {
    if (dragRef.current) return
    const p = pointFromEvent(e)
    if (!p) return
    if (isManagerPicking) { onPickLocation({ x: p.x / 1000, y: p.y / 600 }); return }
    if (picking) { setUserLocation({ x: p.x, y: p.y }); setPicking(false) }
  }
  function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const source = new Image()
      source.onload = () => {
        const scale = Math.min(1, 1800 / Math.max(source.width, source.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(source.width * scale); canvas.height = Math.round(source.height * scale)
        canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
        onImageChange?.(canvas.toDataURL('image/jpeg', 0.8))
      }
      source.src = reader.result
    }
    reader.readAsDataURL(file)
  }
  function normalized(item) { return { x: item.x <= 1 ? item.x * 1000 : item.x * 2.5, y: item.y <= 1 ? item.y * 600 : item.y * 2.5 } }
  function zoomBy(direction) {
    const factor = direction > 0 ? 1.2 : 1 / 1.2
    setZoom((current) => Math.max(1, Math.min(4, +(current * factor).toFixed(2))))
  }
  return <div className="map-shell">
    <div className="map-stage">
      <svg ref={svgRef} viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" onClick={handleMapClick} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onWheel={(e) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 0.15 : -0.15) }} style={{ cursor: isManagerPicking || picking ? 'crosshair' : 'grab', touchAction: 'none' }}>
        <g ref={mapGroupRef} transform={`translate(${pan.x} ${pan.y}) translate(500 300) scale(${zoom}) translate(-500 -300)`}>
          {image ? <image href={image} x="0" y="0" width="1000" height="600" preserveAspectRatio="none" /> : <><rect width="1000" height="600" fill="#dce8dc" /><path d="M0 140 L1000 510 M-40 530 L760 0 M330 0 L690 600 M0 340 L1000 250" stroke="#f8f6ef" strokeWidth="48" /><path d="M0 140 L1000 510 M-40 530 L760 0 M330 0 L690 600 M0 340 L1000 250" stroke="#c5d1c8" strokeWidth="3" /><path d="M90 0 Q150 160 80 600 M820 0 Q750 220 920 600" stroke="#9ec9d0" strokeWidth="35" fill="none" /><text x="500" y="320" textAnchor="middle" fill="#68786c" fontSize="24">Adicione uma imagem de mapa no painel do gestor</text></>}
          {shelters.map((item, i) => { const p = normalized(item); const u = markerScale; return <g key={`${item.name}-${i}`}><path d={`M${p.x} ${p.y - 20*u} L${p.x + 15*u} ${p.y - 5*u} L${p.x + 11*u} ${p.y + 14*u} L${p.x - 11*u} ${p.y + 14*u} L${p.x - 15*u} ${p.y - 5*u} Z`} fill="#1687d9" stroke="white" strokeWidth={3*u}/><title>{item.name}</title></g> })}
          {areas.map((item) => { const p = normalized(item); const color = STATUS_COLOR[statusFromArea(item)]; const u = markerScale; return <g key={item.id} onClick={(e) => { e.stopPropagation(); onSelectArea?.(item.id) }} style={{ cursor: 'pointer' }}><circle cx={p.x} cy={p.y} r={21*u} fill={color} opacity=".25"/><circle cx={p.x} cy={p.y} r={11*u} fill={color} stroke="white" strokeWidth={4*u}/><title>{item.name}</title></g> })}
          {points.map((item) => { const p = normalized(item); const focused = String(focusAreaId) === String(item.id); const u = markerScale; return <g key={item.id} onClick={(e) => { e.stopPropagation(); onSelectArea?.(item.id) }} style={{ cursor: 'pointer' }}><circle cx={p.x} cy={p.y} r={(focused ? 29 : 22)*u} fill="#e34e42" opacity=".25"/><circle cx={p.x} cy={p.y} r={12*u} fill="#e34e42" stroke="white" strokeWidth={4*u}/><title>{item.name}</title></g> })}
          {userLocation && <circle cx={userLocation.x} cy={userLocation.y} r={12*markerScale} fill="#1769e0" stroke="white" strokeWidth={5*markerScale}/>}
          {labelItems.filter((item) => !item.hidden).map((item) => <text key={`label-${item.id}`} x={item.labelX} y={item.labelY} textAnchor="middle" fontSize={item.fontSize} fontWeight="700" fill={item.kind === 'point' ? '#54211d' : item.kind === 'shelter' ? '#102d42' : item.kind === 'user' ? '#12356d' : '#202a24'} stroke="white" strokeWidth={3*sizeScale} paintOrder="stroke" pointerEvents="none">{item.name}</text>)}
        </g>
      </svg>
      {onImageChange && <label className="map-upload">▧ Trocar imagem<input type="file" accept="image/*" onChange={handleUpload} /></label>}
      <div className="map-zoom"><button aria-label="Aproximar" onClick={() => zoomBy(.25)}>+</button><button aria-label="Afastar" onClick={() => zoomBy(-.25)}>−</button><button aria-label="Recentrar mapa" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>⌖</button></div>
      {isManagerPicking && <div className="map-pick-hint">{pickingLabel || 'Toque no mapa para marcar o ponto'}</div>}
    </div>
    {hiddenLabels.length > 0 && <div className="map-overflow-labels"><span>Locais próximos:</span>{hiddenLabels.map((item) => item.targetId ? <button key={item.id} onClick={() => onSelectArea?.(item.targetId)}>{item.name}</button> : <small key={item.id}>{item.name}</small>)}</div>}
    {!isManagerPicking && <button className="btn secondary" style={{ marginTop: 10, width: '100%' }} onClick={() => setPicking((current) => !current)}>{picking ? 'Toque no mapa para marcar' : userLocation ? '📍 Atualizar minha localização' : '📍 Simular minha localização'}</button>}
    <p className="map-caption">Arraste para mover · use os botões ou a roda do mouse para aproximar</p>
  </div>
}
