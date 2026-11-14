import { useMemo, useState } from 'react'
import { useSensors } from '../context/SensorContext.jsx'
import { statusFromArea, statusLabel } from '../utils/risk.js'
import StatusBadge from '../components/StatusBadge.jsx'
import SchematicMap from '../components/SchematicMap.jsx'

export default function AdminAlertsPage() {
  const { areas, alerts, resolveAlertLocally, shelters, addShelter, updateShelter, removeShelter, addPublicPoint, updatePublicPoint, removePublicPoint, publicPoints, mapImage, updateMapImage } = useSensors()
  const [pickFor, setPickFor] = useState('')
  const [formFor, setFormFor] = useState('')
  const [location, setLocation] = useState(null)
  const [shelterName, setShelterName] = useState('')
  const [shelterAddress, setShelterAddress] = useState('')
  const [pointName, setPointName] = useState('')
  const [pointType, setPointType] = useState('Enchente')
  const [instruction, setInstruction] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(null)
  const active = alerts.filter((a) => !a.resolved)
  const orderedAreas = useMemo(() => [...areas].sort((a, b) => {
    const rank = { critico: 0, atencao: 1, normal: 2 }
    const difference = rank[statusFromArea(a)] - rank[statusFromArea(b)]
    return difference || (b.value / b.threshold) - (a.value / a.threshold)
  }), [areas])

  function beginPick(type) {
    setEditing(null)
    setFormFor('')
    setLocation(null)
    setNotice('')
    setPickFor(type)
    window.setTimeout(() => document.querySelector('.manager-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }
  function handleMapPick(point) {
    setLocation(point)
    setPickFor('')
    setFormFor('')
    setNotice('')
    // Give a short, visible confirmation before opening the registration form.
    window.setTimeout(() => setFormFor(pickFor), 300)
  }
  function closeForm() { setFormFor(''); setNotice('') }
  function editShelter(id) {
    const shelter = shelters.find((item) => String(item.id) === String(id))
    if (!shelter) return
    setEditing({ type: 'shelter', id: shelter.id })
    setShelterName(shelter.name); setShelterAddress(shelter.address === 'Endereço não informado' ? '' : shelter.address)
    setLocation({ x: shelter.x, y: shelter.y }); setFormFor('shelter'); setPickFor('')
  }
  function editPoint(id) {
    const point = publicPoints.find((item) => String(item.id) === String(id))
    if (!point) return
    setEditing({ type: 'point', id: point.id })
    setPointName(point.name); setPointType(point.type); setInstruction(point.instruction || '')
    setLocation({ x: point.x, y: point.y }); setFormFor('point'); setPickFor('')
  }
  function deleteEditing() {
    if (!editing) return
    if (editing.type === 'shelter') removeShelter(editing.id)
    else removePublicPoint(editing.id)
    setEditing(null); setFormFor('')
  }
  function submitShelter(e) {
    e.preventDefault()
    if (!shelterName.trim() || !location) return
    const values = { name: shelterName.trim(), address: shelterAddress.trim() || 'Endereço não informado', capacity: 0, ...location }
    if (editing?.type === 'shelter') updateShelter(editing.id, values)
    else addShelter(values)
    setShelterName(''); setShelterAddress(''); setEditing(null); closeForm()
  }
  function submitPoint(e) {
    e.preventDefault()
    if (!pointName.trim() || !instruction.trim() || !location) return
    const values = { name: pointName.trim(), type: pointType, instruction: instruction.trim(), ...location }
    if (editing?.type === 'point') updatePublicPoint(editing.id, values)
    else addPublicPoint(values)
    setPointName(''); setInstruction(''); setEditing(null); closeForm()
  }

  return <main className="page manager-page">
    <div className="manager-title"><div><span className="eyebrow">ÁREA RESTRITA</span><h1>Painel do gestor</h1><p className="muted">Monitore sensores e cadastre locais diretamente no mapa.</p></div></div>
    <div className="manager-workspace">
      <aside className="manager-sensors" aria-label="Sensores ativos ordenados por criticidade">
        <div className="manager-panel-heading"><div><span className="eyebrow">MONITORAMENTO</span><h2>Sensores ativos</h2></div><span className="count-pill">{areas.length}</span></div>
        <p className="muted">Ordenados do mais crítico ao mais estável.</p>
        <div className="manager-sensor-list">{orderedAreas.map((area) => <article className={`manager-sensor-card risk-${statusFromArea(area)}`} key={area.id}>
          <div className="manager-sensor-card-top"><span className="manager-risk-dot" aria-hidden="true"/><b>{area.name}</b></div>
          <StatusBadge status={statusFromArea(area)} />
          <p>{area.type}</p><strong>{area.sensor}: {area.value}{area.unit}</strong>
          <small>Limite: {area.threshold}{area.unit} · {statusLabel(statusFromArea(area))}</small>
        </article>)}</div>
      </aside>
      <section className={`manager-map-panel ${pickFor ? 'is-picking' : ''}`} aria-label="Mapa e cadastro de locais">
        <div className="manager-map-toolbar">
          <div><span className="eyebrow">MAPA DA REGIÃO</span><h2>Mapa de referência</h2></div>
          <div className="manager-map-actions">
            <button className="btn manager-add-button" onClick={() => beginPick('shelter')}><span aria-hidden="true">＋</span> Cadastrar abrigo</button>
            <button className="btn manager-add-button" onClick={() => beginPick('point')}><span aria-hidden="true">＋</span> Cadastrar ponto de atenção</button>
          </div>
        </div>
        {pickFor && <div className="manager-pick-banner" role="status"><span aria-hidden="true">⌖</span> Clique no mapa para escolher a localização {pickFor === 'shelter' ? 'do abrigo' : 'do ponto de atenção'}. <button onClick={() => { setPickFor(''); setNotice('') }}>Cancelar</button></div>}
        {notice && <div className="manager-map-notice" role="status">{notice}</div>}
        <div className="manager-map"><SchematicMap areas={areas} shelters={shelters} points={publicPoints} image={mapImage} onImageChange={updateMapImage} onSelectArea={(id) => { if (publicPoints.some((point) => String(point.id) === String(id))) editPoint(id) }} onSelectShelter={editShelter} onPickLocation={pickFor ? handleMapPick : undefined} pickingLabel={pickFor === 'shelter' ? 'Clique no mapa para marcar o abrigo' : 'Clique no mapa para marcar o ponto de atenção'} /></div>
        <p className="map-caption">Arraste para mover · use os botões ou a roda do mouse para aproximar</p>
      </section>
    </div>
    <section className="manager-section manager-alerts-section"><h2>Alertas ativos <span className="count-pill">{active.length}</span></h2>{active.length ? active.map((alert) => { const area = [...publicPoints, ...areas].find((a) => String(a.id) === String(alert.areaId)); return <article className="manager-alert" key={alert.id}><div><b>{area?.name || alert.areaId}</b><p>{area?.type || 'Ponto de atenção'} · {alert.time}</p></div><button className="btn secondary" onClick={() => resolveAlertLocally(alert.id)}>Encerrar</button></article> }) : <p className="muted">Nenhum alerta ativo.</p>}</section>
    {formFor && <div className="manager-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeForm() }}>
      <section className="manager-modal" role="dialog" aria-modal="true" aria-labelledby="manager-modal-title">
        <button className="manager-modal-close" aria-label="Fechar" onClick={closeForm}>×</button>
        <span className="eyebrow">{editing ? 'EDITAR LOCAL' : 'LOCALIZAÇÃO MARCADA'}</span><h2 id="manager-modal-title">{editing ? `Editar ${formFor === 'shelter' ? 'abrigo' : 'ponto de atenção'}` : formFor === 'shelter' ? 'Cadastrar abrigo' : 'Cadastrar ponto de atenção'}</h2>
        <p className="muted">Preencha as informações para salvar este local no mapa.</p>
        {formFor === 'shelter' ? <form className="manager-form" onSubmit={submitShelter}>
          <label>Nome do abrigo<input className="input" value={shelterName} onChange={(e) => setShelterName(e.target.value)} required autoFocus /></label>
          <label>Endereço<input className="input" value={shelterAddress} onChange={(e) => setShelterAddress(e.target.value)} placeholder="Rua e número" /></label>
          <p className="manager-location-confirm">✓ Localização selecionada no mapa</p>
          <div className="manager-modal-actions">{editing && <button type="button" className="btn danger" onClick={deleteEditing}>Remover</button>}<button type="button" className="btn secondary" onClick={closeForm}>Cancelar</button><button className="btn">{editing ? 'Salvar alterações' : 'Adicionar abrigo'}</button></div>
        </form> : <form className="manager-form" onSubmit={submitPoint}>
          <label>Nome do local<input className="input" value={pointName} onChange={(e) => setPointName(e.target.value)} required autoFocus /></label>
          <label>Ocorrência<select className="input" value={pointType} onChange={(e) => setPointType(e.target.value)}><option>Enchente</option><option>Deslizamento</option><option>Onda de calor</option><option>Outro ponto de atenção</option></select></label>
          <label>Orientação direta<textarea className="input" rows="3" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Ex.: Evite a rua e siga para o abrigo..." required /></label>
          <p className="manager-location-confirm">✓ Localização selecionada no mapa</p>
          <div className="manager-modal-actions">{editing && <button type="button" className="btn danger" onClick={deleteEditing}>Remover</button>}<button type="button" className="btn secondary" onClick={closeForm}>Cancelar</button><button className="btn">{editing ? 'Salvar alterações' : 'Publicar alerta'}</button></div>
        </form>}
      </section>
    </div>}
  </main>
}
