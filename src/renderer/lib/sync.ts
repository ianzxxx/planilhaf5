type SyncEvent =
  | 'ponto:funcionarios-changed'
  | 'ponto:pontos-changed'
  | 'ponto:data-changed'

function emit(evento: SyncEvent): void {
  window.dispatchEvent(new Event(evento))
}

/** Chamar após criar/editar/inativar/reativar funcionário */
export function notifyFuncionariosChanged(): void {
  emit('ponto:funcionarios-changed')
  emit('ponto:data-changed')
}

/** Chamar após batida, ausência, edição ou exclusão de ponto */
export function notifyPontosChanged(): void {
  emit('ponto:pontos-changed')
  emit('ponto:data-changed')
}

export function onFuncionariosChanged(handler: () => void): () => void {
  window.addEventListener('ponto:funcionarios-changed', handler)
  return () => window.removeEventListener('ponto:funcionarios-changed', handler)
}

export function onPontosChanged(handler: () => void): () => void {
  window.addEventListener('ponto:pontos-changed', handler)
  return () => window.removeEventListener('ponto:pontos-changed', handler)
}

export function onDataChanged(handler: () => void): () => void {
  window.addEventListener('ponto:data-changed', handler)
  return () => window.removeEventListener('ponto:data-changed', handler)
}
