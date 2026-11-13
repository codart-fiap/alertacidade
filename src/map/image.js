// Lê um arquivo de imagem, comprime/redimensiona via canvas se necessário, e
// devolve o data URL junto com a LARGURA E ALTURA REAIS da imagem — é isso
// que o MapView precisa pra desenhar o mapa sem distorcer (diferente da
// versão anterior do SchematicMap, que espremia qualquer imagem num box fixo
// de 1000x600). Extraído do módulo de mapa do Click Way.

const DEFAULT_MAX_DIMENSION = 1800
const DEFAULT_QUALITY = 0.8

/**
 * @returns {Promise<{dataUrl: string, width: number, height: number}>}
 */
export function loadAndCompressImage(file, options = {}) {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION
  const quality = options.quality ?? DEFAULT_QUALITY
  const outputFormat = options.outputFormat ?? 'image/jpeg'

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('O arquivo selecionado não é uma imagem válida.'))
      img.onload = () => {
        const scaleFactor = Math.min(1, maxDimension / Math.max(img.width, img.height))
        const width = Math.round(img.width * scaleFactor)
        const height = Math.round(img.height * scaleFactor)

        if (scaleFactor === 1) {
          resolve({ dataUrl: reader.result, width, height })
          return
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve({ dataUrl: reader.result, width: img.width, height: img.height })
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve({ dataUrl: canvas.toDataURL(outputFormat, quality), width, height })
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Dado um data URL já existente (ex: carregado do localStorage, sem
 * width/height guardados), descobre as dimensões reais da imagem.
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = () => reject(new Error('Não foi possível ler as dimensões da imagem.'))
    img.src = dataUrl
  })
}
