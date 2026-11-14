import { useState } from 'react'
import { useSensors } from '../context/SensorContext.jsx'
import { statusFromArea } from '../utils/risk.js'
import StatusBadge from '../components/StatusBadge.jsx'
import SchematicMap from '../components/SchematicMap.jsx'

const EMPTY_SENSOR = { name: '', type: 'Enchente', sensor: '', unit: 'm', value: 0, threshold: 1, active: true, x: 0.5, y: 0.5 }

export default function AdminSensorsPage() {
  const { areas, addSensor, updateSensor, removeSensor, shelters, publicPoints, mapImage, updateMapImage } = useSensors()
  const [draft, setDraft] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [pickLocation, setPickLocation] = useState(false)
  const [notice, setNotice] = useState('')
  const active = areas.filter((sensor) => sensor.active !== false)
  const inactive = areas.filter((sensor) => sensor.active === false)

  function startNew() {
    setDraft({ ...EMPTY_SENSOR }); setEditingId(null); setPickLocation(true); setNotice('')
    window.setTimeout(() => document.querySelector('.admin-sensor-map-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }
  function edit(sensor) {
    setDraft({ ...sensor }); setEditingId(sensor.id); setPickLocation(false); setNotice('')
  }
  function handleMapPick(point) {
    setDraft((current) => ({ ...(current || EMPTY_SENSOR), ...point }))
    setPickLocation(false)
    setNotice('Localização selecionada. Preencha ou revise os dados do sensor.')
    setDraft((current) => ({ ...(current || EMPTY_SENSOR), ...point }))
  }
  function save(e) {
    e.preventDefault()
    if (!draft || !draft.name.trim() || !draft.sensor.trim()) return
    const values = { ...draft, name: draft.name.trim(), sensor: draft.sensor.trim(), type: draft.type.trim(), unit: draft.unit.trim() }
    if (editingId != null) updateSensor(editingId, values)
    else addSensor(values)
    setDraft(null); setEditingId(null); setNotice('Sensor salvo com sucesso.')
  }
  function remove(sensor) {
    removeSensor(sensor.id)
    if (String(editingId) === String(sensor.id)) { setDraft(null); setEditingId(null) }
    setNotice(`Sensor “${sensor.name}” removido.`)
  }
  function renderSensor(sensor) {
    return <article className={`admin-sensor-row ${sensor.active === false ? 'is-inactive' : ''}`} key={sensor.id}>
      <div className="admin-sensor-main"><div className="admin-sensor-name"><span className={`admin-sensor-state-dot ${sensor.active === false ? 'is-inactive' : ''}`} /><h3>{sensor.name}</h3></div>
        <div className="admin-sensor-meta"><span>{sensor.type}</span><StatusBadge status={sensor.active === false ? 'normal' : statusFromArea(sensor)} />{sensor.active === false && <span className="admin-inactive-label">Inativo</span>}</div>
        <p>{sensor.sensor}: <b>{sensor.value}{sensor.unit}</b> · Limite {sensor.threshold}{sensor.unit}</p>
      </div>
      <div className="admin-sensor-actions"><button className="btn secondary" onClick={() => edit(sensor)}>Editar</button><button className="btn danger" onClick={() => remove(sensor)}>Excluir</button></div>
    </article>
  }

  return <main className="page manager-page admin-sensors-page">
    <div className="manager-title admin-sensors-title"><div><span className="eyebrow">ÁREA RESTRITA</span><h1>Gestão de sensores</h1><p className="muted">Cadastre sensores, configure limites e gerencie os que estão ativos ou inativos.</p></div><button className="btn" onClick={startNew}>＋ Cadastrar sensor</button></div>
    <div className="admin-sensors-layout">
      <section className="admin-sensor-list-panel">
        <div className="admin-sensor-section-heading"><h2>Sensores ativos</h2><span className="count-pill">{active.length}</span></div>
        {active.length ? active.map(renderSensor) : <p className="muted">Nenhum sensor ativo.</p>}
        <div className="admin-sensor-section-heading inactive-heading"><h2>Sensores inativos</h2><span className="count-pill neutral">{inactive.length}</span></div>
        {inactive.length ? inactive.map(renderSensor) : <p className="muted">Nenhum sensor inativo.</p>}
      </section>
      <section className={`manager-map-panel admin-sensor-map-panel ${pickLocation ? 'is-picking' : ''}`}>
        <div className="manager-map-toolbar"><div><span className="eyebrow">LOCALIZAÇÃO DOS SENSORES</span><h2>Mapa de referência</h2></div></div>
        {pickLocation && <div className="manager-pick-banner" role="status"><span aria-hidden="true">⌖</span> Clique no mapa para marcar a localização do sensor.<button onClick={() => setPickLocation(false)}>Cancelar</button></div>}
        {notice && <div className="manager-map-notice" role="status">{notice}</div>}
        <div className="manager-map"><SchematicMap areas={areas} shelters={shelters} points={publicPoints} image={mapImage} onImageChange={updateMapImage} onSelectSensor={(id) => { const sensor = areas.find((area) => String(area.id) === String(id)); if (sensor) edit(sensor) }} onPickLocation={pickLocation ? handleMapPick : undefined} pickingLabel="Clique no mapa para marcar a localização do sensor" /></div>
        <p className="map-caption">Clique em um sensor no mapa para editar · arraste e aproxime para navegar</p>
      </section>
    </div>
    {draft && !pickLocation && <div className="manager-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setDraft(null) }}>
      <section className="manager-modal" role="dialog" aria-modal="true" aria-labelledby="sensor-form-title">
        <button className="manager-modal-close" aria-label="Fechar formulário" onClick={() => setDraft(null)}>×</button>
        <span className="eyebrow">CONFIGURAÇÃO DO SENSOR</span><h2 id="sensor-form-title">{editingId != null ? 'Atualizar sensor' : 'Cadastrar sensor'}</h2>
        <form className="manager-form" onSubmit={save}>
          <label>Nome do local<input className="input" autoFocus required value={draft.name} onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))} placeholder="Ex.: Córrego Central" /></label>
          <label>Tipo de ocorrência<select className="input" value={draft.type} onChange={(e) => setDraft((current) => ({ ...current, type: e.target.value }))}><option>Enchente</option><option>Deslizamento</option><option>Onda de calor</option><option>Outro</option></select></label>
          <label>Nome da medição<input className="input" required value={draft.sensor} onChange={(e) => setDraft((current) => ({ ...current, sensor: e.target.value }))} placeholder="Ex.: Nível de água" /></label>
          <div className="admin-sensor-numeric-fields"><label>Unidade<input className="input" required value={draft.unit} onChange={(e) => setDraft((current) => ({ ...current, unit: e.target.value }))} placeholder="m, %, °C" /></label><label>Limite de alerta<input className="input" type="number" step="any" min="0.001" required value={draft.threshold} onChange={(e) => setDraft((current) => ({ ...current, threshold: e.target.value }))} /></label></div>
          <label>Leitura atual<input className="input" type="number" step="any" min="0" required value={draft.value} onChange={(e) => setDraft((current) => ({ ...current, value: e.target.value }))} /></label>
          <label className="manager-checkbox-label"><input type="checkbox" checked={draft.active !== false} onChange={(e) => setDraft((current) => ({ ...current, active: e.target.checked }))} /> Sensor ativo</label>
          <p className="manager-location-confirm">✓ Localização {editingId != null ? 'atual' : 'selecionada'} no mapa</p>
          <button type="button" className="btn secondary" onClick={() => { setPickLocation(true); setNotice('') }}>Selecionar localização no mapa</button>
          <div className="manager-modal-actions"><button type="button" className="btn secondary" onClick={() => setDraft(null)}>Cancelar</button><button className="btn">{editingId != null ? 'Salvar alterações' : 'Adicionar sensor'}</button></div>
        </form>
      </section>
    </div>}
  </main>
}
