import { useState } from 'react'
import { useSensors } from '../context/SensorContext.jsx'

const EMPTY_DRAFT = { title: '', message: '', scope: 'global', sensorId: '' }

export default function AdminNotificationsPage() {
  const { areas, managerNotifications, addManagerNotification, updateManagerNotification, removeManagerNotification } = useSensors()
  const [draft, setDraft] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [feedback, setFeedback] = useState('')
  const activeSensors = areas.filter((area) => area.active !== false)
  const activeCount = managerNotifications.filter((notification) => notification.active).length

  function startNew() {
    setDraft({ ...EMPTY_DRAFT, sensorId: activeSensors[0] ? String(activeSensors[0].id) : '' })
    setEditingId(null); setFeedback('')
  }
  function startEdit(notification) {
    setDraft({ title: notification.title, message: notification.message, scope: notification.scope, sensorId: notification.sensorId == null ? '' : String(notification.sensorId) })
    setEditingId(notification.id); setFeedback('')
  }
  function submit(e) {
    e.preventDefault()
    if (!draft?.title.trim() || !draft.message.trim()) return
    if (draft.scope === 'sensor' && !draft.sensorId) return
    const values = { title: draft.title.trim(), message: draft.message.trim(), scope: draft.scope, sensorId: draft.scope === 'sensor' ? draft.sensorId : null }
    if (editingId) {
      updateManagerNotification(editingId, values)
      setFeedback('Notificação atualizada.')
    } else {
      addManagerNotification(values)
      setFeedback('Notificação emitida.')
    }
    setDraft(null); setEditingId(null)
  }
  function toggleActive(notification) {
    updateManagerNotification(notification.id, { active: !notification.active })
  }
  function deleteNotification(notification) {
    removeManagerNotification(notification.id)
    if (editingId === notification.id) { setDraft(null); setEditingId(null) }
    setFeedback('Notificação removida.')
  }
  function sensorName(notification) {
    return areas.find((area) => String(area.id) === String(notification.sensorId))?.name || 'Sensor removido'
  }

  return <main className="page manager-page admin-notifications-page">
    <div className="manager-title admin-sensors-title">
      <div><span className="eyebrow">ÁREA RESTRITA</span><h1>Notificações</h1><p className="muted">Emita avisos para todos ou direcione uma orientação para a área de um sensor.</p></div>
      {!draft && <button className="btn" onClick={startNew}>＋ Nova notificação</button>}
    </div>
    {feedback && <p className="manager-notification-feedback" role="status">{feedback}</p>}
    <div className="notification-audience-cards">
      <article><span className="notification-audience-icon global">◎</span><div><b>Alerta geral</b><p>É mostrado a todas as pessoas que acessam o mapa.</p></div></article>
      <article><span className="notification-audience-icon area">⌖</span><div><b>Alerta por área</b><p>Só aparece quando a localização marcada está dentro da zona monitorada do sensor.</p></div></article>
    </div>
    {draft && <section className="admin-notification-form-panel">
      <div className="manager-panel-heading"><div><span className="eyebrow">{editingId ? 'EDIÇÃO' : 'NOVA PUBLICAÇÃO'}</span><h2>{editingId ? 'Editar notificação' : 'Emitir notificação'}</h2></div><button className="manager-modal-close inline-close" aria-label="Fechar formulário" onClick={() => { setDraft(null); setEditingId(null) }}>×</button></div>
      <form className="manager-form" onSubmit={submit}>
        <label>Destinatários<select className="input" value={draft.scope} onChange={(e) => setDraft((current) => ({ ...current, scope: e.target.value }))}><option value="global">Todas as pessoas (alerta geral)</option><option value="sensor">Somente uma área monitorada por sensor</option></select></label>
        {draft.scope === 'sensor' && <label>Sensor da área<select className="input" required value={draft.sensorId} onChange={(e) => setDraft((current) => ({ ...current, sensorId: e.target.value }))}><option value="" disabled>Selecione um sensor ativo</option>{activeSensors.map((sensor) => <option key={sensor.id} value={sensor.id}>{sensor.name} · {sensor.type}</option>)}</select>{!activeSensors.length && <small className="muted">Cadastre ou ative um sensor para direcionar uma notificação.</small>}</label>}
        <label>Título<input className="input" required maxLength="90" value={draft.title} onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))} placeholder="Ex.: Alerta de enchente" /></label>
        <label>Orientação para a população<textarea className="input" rows="4" required maxLength="600" value={draft.message} onChange={(e) => setDraft((current) => ({ ...current, message: e.target.value }))} placeholder="Explique o risco e o que as pessoas devem fazer." /></label>
        {draft.scope === 'sensor' ? <p className="manager-location-confirm">✓ A notificação será exibida dentro da zona monitorada desse sensor.</p> : <p className="notification-global-note">O alerta geral será exibido para todos, independentemente da localização marcada.</p>}
        <div className="manager-modal-actions"><button type="button" className="btn secondary" onClick={() => { setDraft(null); setEditingId(null) }}>Cancelar</button><button className="btn">{editingId ? 'Salvar alterações' : 'Emitir alerta'}</button></div>
      </form>
    </section>}
    <section className="admin-notification-list-panel">
      <div className="admin-sensor-section-heading"><h2>Notificações emitidas</h2><span className="count-pill">{activeCount} ativas</span></div>
      {managerNotifications.length ? managerNotifications.map((notification) => <article className={`admin-notification-row ${notification.active ? '' : 'is-inactive'}`} key={notification.id}>
        <div className="admin-notification-info"><div className="admin-notification-title"><h3>{notification.title}</h3><span className={`notification-scope-pill ${notification.scope}`}>{notification.scope === 'global' ? 'Geral · todos' : `Área · ${sensorName(notification)}`}</span><span className={`notification-status-pill ${notification.active ? 'active' : ''}`}>{notification.active ? 'Ativa' : 'Desativada'}</span></div><p>{notification.message}</p><small>{notification.createdAt ? new Date(notification.createdAt).toLocaleString('pt-BR') : ''}</small></div>
        <div className="admin-notification-actions"><button className="btn secondary" onClick={() => startEdit(notification)}>Editar</button><button className="btn secondary" onClick={() => toggleActive(notification)}>{notification.active ? 'Desativar' : 'Ativar'}</button><button className="btn danger" onClick={() => deleteNotification(notification)}>Excluir</button></div>
      </article>) : <p className="muted">Nenhuma notificação foi emitida ainda.</p>}
    </section>
  </main>
}
