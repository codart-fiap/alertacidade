import { useState } from 'react'
import { useSensors } from '../context/SensorContext.jsx'
import { statusFromArea } from '../utils/risk.js'
import StatusBadge from '../components/StatusBadge.jsx'
import SchematicMap from '../components/SchematicMap.jsx'

export default function AdminAlertsPage() {
  const { areas, alerts, resolveAlertLocally, shelters, addShelter, addPublicPoint, publicPoints, mapImage, updateMapImage } = useSensors()
  const [shelterName, setShelterName] = useState('')
  const [shelterAddress, setShelterAddress] = useState('')
  const [pointName, setPointName] = useState('')
  const [pointType, setPointType] = useState('Enchente')
  const [instruction, setInstruction] = useState('')
  const [shelterLocation, setShelterLocation] = useState({ x: 0.5, y: 0.5 })
  const [pointLocation, setPointLocation] = useState({ x: 0.5, y: 0.5 })
  const [pickFor, setPickFor] = useState('')
  const active = alerts.filter((a) => !a.resolved)

  function submitShelter(e) {
    e.preventDefault()
    if (!shelterName.trim()) return
    addShelter({ name: shelterName.trim(), address: shelterAddress.trim() || 'Endereço não informado', capacity: 0, ...shelterLocation })
    setShelterName(''); setShelterAddress('')
  }
  function submitPoint(e) {
    e.preventDefault()
    if (!pointName.trim() || !instruction.trim()) return
    addPublicPoint({ name: pointName.trim(), type: pointType, instruction: instruction.trim(), ...pointLocation })
    setPointName(''); setInstruction('')
  }

  function handleMapPick(location) {
    if (pickFor === 'shelter') setShelterLocation(location)
    if (pickFor === 'point') setPointLocation(location)
    setPickFor('')
  }

  return <main className="page manager-page">
    <div className="manager-title"><div><span className="eyebrow">ÁREA RESTRITA</span><h1>Painel do gestor</h1><p className="muted">Sensores, abrigos e avisos públicos.</p></div></div>
    <section className="manager-section"><h2>Monitoramento dos sensores</h2><div className="sensor-grid">{areas.map((area) => <article className="sensor-card" key={area.id}><div className="sensor-card-top"><b>{area.name}</b><StatusBadge status={statusFromArea(area)} /></div><p>{area.type}</p><strong>{area.sensor}: {area.value}{area.unit}</strong></article>)}</div></section>
    <section className="manager-section"><h2>Mapa de referência</h2><p className="muted">Carregue a imagem da região. Arraste e aproxime para navegar.</p><SchematicMap areas={areas} shelters={shelters} points={publicPoints} image={mapImage} onImageChange={updateMapImage} onPickLocation={pickFor ? handleMapPick : undefined} pickingLabel={pickFor === 'shelter' ? 'Toque no mapa para marcar o abrigo' : 'Toque no mapa para marcar o ponto de atenção'} /></section>
    <section className="manager-section"><h2>Alertas ativos <span className="count-pill">{active.length}</span></h2>{active.length ? active.map((alert) => { const area = areas.find((a) => a.id === alert.areaId); return <article className="manager-alert" key={alert.id}><div><b>{area?.name || alert.areaId}</b><p>{area?.type || 'Ponto de atenção'} · {alert.time}</p></div><button className="btn secondary" onClick={() => resolveAlertLocally(alert.id)}>Encerrar</button></article> }) : <p className="muted">Nenhum alerta ativo.</p>}</section>
    <section className="manager-section"><h2>Cadastrar abrigo</h2><p className="muted">O abrigo aparecerá no mapa público.</p><form className="manager-form" onSubmit={submitShelter}><label>Nome do abrigo<input className="input" value={shelterName} onChange={(e) => setShelterName(e.target.value)} required /></label><label>Endereço<input className="input" value={shelterAddress} onChange={(e) => setShelterAddress(e.target.value)} placeholder="Rua e número" /></label><button className="btn secondary" type="button" onClick={() => setPickFor('shelter')}>Marcar localização no mapa</button><span className="muted">Localização selecionada no mapa</span><button className="btn">Adicionar abrigo</button></form><ul className="shelter-list">{shelters.map((shelter, i) => <li key={`${shelter.name}-${i}`}><span>◆</span><div><b>{shelter.name}</b><small>{shelter.address}</small></div></li>)}</ul></section>
    <section className="manager-section"><h2>Publicar ponto de atenção</h2><p className="muted">O resumo e a orientação ficam visíveis para todos os cidadãos.</p><form className="manager-form" onSubmit={submitPoint}><label>Nome do local<input className="input" value={pointName} onChange={(e) => setPointName(e.target.value)} required /></label><label>Ocorrência<select className="input" value={pointType} onChange={(e) => setPointType(e.target.value)}><option>Enchente</option><option>Deslizamento</option><option>Onda de calor</option><option>Outro ponto de atenção</option></select></label><label>Orientação direta<textarea className="input" rows="3" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Ex.: Evite a rua e siga para o abrigo..." required /></label><button className="btn secondary" type="button" onClick={() => setPickFor('point')}>Marcar localização no mapa</button><button className="btn">Publicar alerta</button></form></section>
  </main>
}
