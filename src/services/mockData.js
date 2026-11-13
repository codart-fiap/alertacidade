// Dados simulados usados enquanto a API RESTful do grupo nao existe.
// Formato aqui e proposital: quando a API estiver pronta, a resposta
// dela em JSON deve ter essa mesma "forma" pra nada mais no app
// precisar mudar.

export const mockAreas = [
  { id: 1, name: 'Córrego Vila Esperança', type: 'Enchente', sensor: 'Nível de água (m)', value: 0.8, threshold: 1.5, unit: 'm', x: 90, y: 70 },
  { id: 2, name: 'Encosta Morro Alto', type: 'Deslizamento', sensor: 'Umidade do solo (%)', value: 40, threshold: 75, unit: '%', x: 260, y: 50 },
  { id: 3, name: 'Praça Central', type: 'Onda de calor', sensor: 'Temperatura (°C)', value: 29, threshold: 38, unit: '°C', x: 180, y: 140 },
  { id: 4, name: 'Rio das Pedras', type: 'Enchente', sensor: 'Nível de água (m)', value: 0.6, threshold: 1.5, unit: 'm', x: 320, y: 160 },
]

export const mockShelters = [
  { areaId: 1, name: 'Escola Municipal Dom Pedro', address: 'Rua das Acácias, 120', capacity: 150, x: 130, y: 90 },
  { areaId: 1, name: 'Centro Comunitário Vila Esperança', address: 'Av. Esperança, 45', capacity: 80, x: 60, y: 110 },
  { areaId: 2, name: 'Ginásio Morro Alto', address: 'Rua da Serra, 300', capacity: 200, x: 290, y: 85 },
  { areaId: 3, name: 'UBS Praça Central', address: 'Praça Central, s/n', capacity: 60, x: 200, y: 175 },
  { areaId: 4, name: 'Escola Estadual Rio das Pedras', address: 'Rua do Rio, 88', capacity: 120, x: 350, y: 195 },
]

// usuarios de teste pro login simulado — nunca existiria senha em
// texto puro assim numa API real, isso e so pro mock funcionar
export const mockUsers = [
  { email: 'cidadao@teste.com', password: '123456', role: 'cidadao', name: 'Marlene' },
  { email: 'gestor@teste.com', password: '123456', role: 'gestor', name: 'Ronaldo' },
]
