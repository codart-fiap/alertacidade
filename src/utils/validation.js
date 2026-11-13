// Validacao de formularios no frontend. Isso e so a PRIMEIRA camada
// de defesa — serve pra dar feedback rapido ao usuario e evitar
// requisicoes obviamente invalidas, mas a validacao que realmente
// protege o sistema tem que acontecer tambem no backend (nunca
// confiar so no que o frontend valida).

export function validateEmail(email) {
  if (!email) return 'Informe o e-mail.'
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!pattern.test(email)) return 'E-mail inválido.'
  return null
}

export function validatePassword(password) {
  if (!password) return 'Informe a senha.'
  if (password.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.'
  return null
}
