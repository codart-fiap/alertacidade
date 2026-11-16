import { useState } from 'react'
import { useSensors } from '../context/SensorContext.jsx'
import { statusFromArea } from '../utils/risk.js'
import StatusBadge from '../components/StatusBadge.jsx'
import SchematicMap from '../components/SchematicMap.jsx'
import { createRiskArea, deleteRiskArea, postLeitura, updateRiskArea } from '../services/apiClient.js'

const EMPTY_SENSOR = { name: '', type: 'Enchente', sensor: '', unit: 'm', value: 0, threshold: 1, active: true, x: 0.5, y: 0.5 }
const EMPTY_AREA = { name: '', latitude: '', longitude: '', radiusMeters: 500, riskLevel: 'MEDIO', active: true }

export default function AdminSensorsPage() {
  const { areas, sensors, addSensor, updateSensor, removeSensor, shelters, publicPoints, mapImage, updateMapImage, apiMode, refreshDashboardData } = useSensors()
  const [draft, setDraft] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [pickLocation, setPickLocation] = useState(false)
  const [notice, setNotice] = useState('')
  const [areaDraft, setAreaDraft] = useState(null)
  const [areaEditingId, setAreaEditingId] = useState(null)
  const [pickAreaLocation, setPickAreaLocation] = useState(false)
  const [areaBusy, setAreaBusy] = useState(false)
  const [readingSensor, setReadingSensor] = useState(null)
  const [readingValue, setReadingValue] = useState('')
  const [readingBusy, setReadingBusy] = useState(false)
  const active = sensors.filter((sensor) => sensor.active !== false)
  const inactive = sensors.filter((sensor) => sensor.active === false)

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
  async function registerReading(event) {
    event.preventDefault()
    if (!readingSensor) return
    const value = Number(readingValue.replace(',', '.'))
    if (!Number.isFinite(value) || value < 0) { setNotice('Informe um valor numérico maior ou igual a zero.'); return }
    setReadingBusy(true)
    try {
      await postLeitura(readingSensor.id, value)
      await refreshDashboardData()
      setNotice(`Leitura ${value}${readingSensor.unit} registrada para ${readingSensor.name}.`)
      setReadingSensor(null); setReadingValue('')
    } catch (error) { setNotice(error.message) }
    finally { setReadingBusy(false) }
  }
  function editArea(area) {
    setAreaDraft({ name: area.name, latitude: area.latitude, longitude: area.longitude, radiusMeters: area.radiusMeters, riskLevel: area.riskLevel || 'BAIXO', active: area.active !== false })
    setAreaEditingId(area.id)
    setNotice('')
  }
  async function saveArea(event) {
    event.preventDefault()
    setAreaBusy(true); setNotice('')
    try {
      if (areaEditingId == null) await createRiskArea(areaDraft)
      else await updateRiskArea(areaEditingId, areaDraft)
      await refreshDashboardData()
      setAreaDraft(null); setAreaEditingId(null)
      setNotice(areaEditingId == null ? 'Área de risco criada com sucesso.' : 'Área de risco atualizada com sucesso.')
    } catch (error) { setNotice(error.message) }
    finally { setAreaBusy(false) }
  }
  async function removeArea(area) {
    if (!window.confirm(`Excluir a área “${area.name}”?`)) return
    setAreaBusy(true); setNotice('')
    try {
      await deleteRiskArea(area.id)
      await refreshDashboardData()
      if (String(areaEditingId) === String(area.id)) { setAreaDraft(null); setAreaEditingId(null) }
      setNotice(`Área “${area.name}” excluída.`)
    } catch (error) { setNotice(error.message) }
    finally { setAreaBusy(false) }
  }
  function startAreaCreate() { setAreaDraft({ ...EMPTY_AREA }); setAreaEditingId(null); setNotice('') }
  function changeArea(field, value) { setAreaDraft((current) => ({ ...current, [field]: value })) }
  function handleAreaMapPick(point) {
    // O mapa da aplicação é esquemático; convertemos sua fração para a mesma
    // faixa local aproximada de coordenadas usada para posicionar os dados do Pluvia.
    changeArea('longitude', (-46.72 + point.x * 0.16).toFixed(6))
    changeArea('latitude', (-23.47 - point.y * 0.12).toFixed(6))
    setPickAreaLocation(false)
    setNotice('Localização selecionada no mapa. Você ainda pode ajustar as coordenadas.')
  }
  function renderSensor(sensor) {
    return <article className={`admin-sensor-row ${sensor.active === false ? 'is-inactive' : ''}`} key={sensor.id}>
      <div className="admin-sensor-main"><div className="admin-sensor-name"><span className={`admin-sensor-state-dot ${sensor.active === false ? 'is-inactive' : ''}`} /><h3>{sensor.name}</h3></div>
        <div className="admin-sensor-meta"><span>{sensor.areaName || sensor.type}</span><StatusBadge status={sensor.active === false ? 'normal' : statusFromArea(sensor)} />{sensor.active === false && <span className="admin-inactive-label">Área inativa</span>}</div>
        <p>{sensor.sensor}: <b>{sensor.value == null ? 'Sem leitura disponível' : `${sensor.value}${sensor.unit}`}</b> · Limite {sensor.threshold}{sensor.unit}</p>
        {apiMode && <small>{sensor.lastReadingAt ? `Última leitura: ${new Date(sensor.lastReadingAt).toLocaleString('pt-BR')}` : 'Nenhuma leitura recebida ainda.'}</small>}
      </div>
      {apiMode ? <div className="admin-sensor-actions"><button className="btn secondary" onClick={() => { setReadingSensor(sensor); setReadingValue('') }}>Registrar leitura</button></div> : <div className="admin-sensor-actions"><button className="btn secondary" onClick={() => edit(sensor)}>Editar</button><button className="btn danger" onClick={() => remove(sensor)}>Excluir</button></div>}
    </article>
  }

  return <main className="page manager-page admin-sensors-page">
    <div className="manager-title admin-sensors-title"><div><span className="eyebrow">ÁREA RESTRITA</span><h1>Gestão de sensores</h1><p className="muted">{apiMode ? 'Consulte as áreas e os sensores carregados do Pluvia. A API ainda não oferece cadastro ou edição de sensores.' : 'Cadastre sensores, configure limites e gerencie os que estão ativos ou inativos.'}</p></div>{!apiMode && <button className="btn" onClick={startNew}>＋ Cadastrar sensor</button>}</div>
    {apiMode && <section className="admin-sensor-list-panel admin-risk-areas-panel">
      <div className="admin-sensor-section-heading"><div><h2>Áreas de risco</h2><p className="muted">Cadastre e mantenha as áreas sincronizadas com o Pluvia.</p></div><button className="btn" disabled={areaBusy} onClick={startAreaCreate}>＋ Nova área</button></div>
      {notice && <div className="manager-map-notice" role="status">{notice}</div>}
      {areaDraft && <form className="manager-form admin-risk-area-form" onSubmit={saveArea}>
        <h3>{areaEditingId == null ? 'Cadastrar área de risco' : 'Editar área de risco'}</h3>
      <label>Nome<input className="input" required maxLength="120" value={areaDraft.name} onChange={(e) => changeArea('name', e.target.value)} placeholder="Ex.: Área próxima ao córrego" /></label>
        <button type="button" className="btn secondary" onClick={() => { setPickAreaLocation(true); setNotice(''); window.setTimeout(() => document.querySelector('.admin-sensor-map-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0) }}>⌖ Escolher localização no mapa</button>
        <div className="admin-sensor-numeric-fields"><label>Latitude<input className="input" type="number" step="any" min="-90" max="90" required value={areaDraft.latitude} onChange={(e) => changeArea('latitude', e.target.value)} /></label><label>Longitude<input className="input" type="number" step="any" min="-180" max="180" required value={areaDraft.longitude} onChange={(e) => changeArea('longitude', e.target.value)} /></label></div>
        <div className="admin-sensor-numeric-fields"><label>Raio (metros)<input className="input" type="number" min="1" step="any" required value={areaDraft.radiusMeters} onChange={(e) => changeArea('radiusMeters', e.target.value)} /></label><label>Nível de risco<select className="input" value={areaDraft.riskLevel} onChange={(e) => changeArea('riskLevel', e.target.value)}><option value="BAIXO">Baixo</option><option value="MEDIO">Médio</option><option value="ALTO">Alto</option></select></label></div>
        <label className="manager-checkbox-label"><input type="checkbox" checked={areaDraft.active} onChange={(e) => changeArea('active', e.target.checked)} /> Área ativa</label>
        <div className="manager-modal-actions"><button type="button" className="btn secondary" disabled={areaBusy} onClick={() => { setAreaDraft(null); setAreaEditingId(null) }}>Cancelar</button><button className="btn" disabled={areaBusy}>{areaBusy ? 'Salvando…' : areaEditingId == null ? 'Criar área' : 'Salvar alterações'}</button></div>
      </form>}
      {areas.length ? areas.map((area) => <article className="admin-sensor-row" key={area.id}>
        <div className="admin-sensor-main"><div className="admin-sensor-name"><span className={`admin-sensor-state-dot ${area.active === false ? 'is-inactive' : ''}`} /><h3>{area.name}</h3></div><p>{area.latitude}, {area.longitude} · raio {area.radiusMeters} m · risco {area.riskLevel || '—'} · {area.active === false ? 'inativa' : 'ativa'}</p></div>
        <div className="admin-sensor-actions"><button className="btn secondary" disabled={areaBusy} onClick={() => editArea(area)}>Editar</button><button className="btn danger" disabled={areaBusy} onClick={() => removeArea(area)}>Excluir</button></div>
      </article>) : <p className="muted">Nenhuma área de risco cadastrada.</p>}
    </section>}
    <div className="admin-sensors-layout">
      <section className="admin-sensor-list-panel">
        <div className="admin-sensor-section-heading"><h2>Sensores ativos</h2><span className="count-pill">{active.length}</span></div>
        {active.length ? active.map(renderSensor) : <p className="muted">Nenhum sensor ativo.</p>}
        <div className="admin-sensor-section-heading inactive-heading"><h2>Sensores em áreas inativas</h2><span className="count-pill neutral">{inactive.length}</span></div>
        {inactive.length ? inactive.map(renderSensor) : <p className="muted">Nenhum sensor inativo.</p>}
      </section>
      <section className={`manager-map-panel admin-sensor-map-panel ${pickLocation || pickAreaLocation ? 'is-picking' : ''}`}>
        <div className="manager-map-toolbar"><div><span className="eyebrow">LOCALIZAÇÃO DOS SENSORES</span><h2>Mapa de referência</h2></div></div>
        {pickLocation && <div className="manager-pick-banner" role="status"><span aria-hidden="true">⌖</span> Clique no mapa para marcar a localização do sensor.<button onClick={() => setPickLocation(false)}>Cancelar</button></div>}
        {pickAreaLocation && <div className="manager-pick-banner" role="status"><span aria-hidden="true">⌖</span> Clique no mapa para definir a localização da área de risco.<button onClick={() => setPickAreaLocation(false)}>Cancelar</button></div>}
        {notice && <div className="manager-map-notice" role="status">{notice}</div>}
        <div className="manager-map"><SchematicMap areas={areas} sensors={sensors} shelters={shelters} points={publicPoints} image={mapImage} onImageChange={apiMode ? undefined : updateMapImage} onSelectSensor={apiMode ? undefined : (id) => { const sensor = sensors.find((item) => String(item.areaId ?? item.id) === String(id)); if (sensor) edit(sensor) }} onPickLocation={pickAreaLocation ? handleAreaMapPick : pickLocation ? handleMapPick : undefined} pickingLabel={pickAreaLocation ? 'Clique no mapa para marcar a área de risco' : 'Clique no mapa para marcar a localização do sensor'} /></div>
        <p className="map-caption">{apiMode ? 'Áreas e sensores recebidos do Pluvia.' : 'Clique em um sensor no mapa para editar · arraste e aproxime para navegar'}</p>
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
    {readingSensor && <div className="manager-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !readingBusy) setReadingSensor(null) }}>
      <section className="manager-modal" role="dialog" aria-modal="true" aria-labelledby="reading-form-title">
        <button className="manager-modal-close" aria-label="Fechar formulário" disabled={readingBusy} onClick={() => setReadingSensor(null)}>×</button>
        <span className="eyebrow">LEITURA DO SENSOR</span><h2 id="reading-form-title">{readingSensor.name}</h2>
        <p className="muted">Limite configurado: {readingSensor.threshold}{readingSensor.unit}. Uma leitura acima do limite pode gerar um alerta.</p>
        <form className="manager-form" onSubmit={registerReading}>
          <label>Valor ({readingSensor.unit})<input className="input" type="number" min="0" step="any" required autoFocus value={readingValue} onChange={(e) => setReadingValue(e.target.value)} placeholder="Ex.: 325" /></label>
          <div className="manager-modal-actions"><button type="button" className="btn secondary" disabled={readingBusy} onClick={() => setReadingSensor(null)}>Cancelar</button><button className="btn" disabled={readingBusy}>{readingBusy ? 'Enviando…' : 'Enviar leitura'}</button></div>
        </form>
      </section>
    </div>}
  </main>
}
