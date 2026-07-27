import { useEffect } from 'react'
import {
  onDataChanged,
  onFuncionariosChanged,
  onPontosChanged
} from '../lib/sync'

/** Recarrega quando funcionários mudarem (cadastro, edição, inativação). */
export function useSyncFuncionarios(reload: () => void | Promise<void>): void {
  useEffect(() => {
    return onFuncionariosChanged(() => {
      void reload()
    })
  }, [reload])
}

/** Recarrega quando pontos/ausências mudarem. */
export function useSyncPontos(reload: () => void | Promise<void>): void {
  useEffect(() => {
    return onPontosChanged(() => {
      void reload()
    })
  }, [reload])
}

/** Recarrega em qualquer mudança de dados do app. */
export function useSyncData(reload: () => void | Promise<void>): void {
  useEffect(() => {
    return onDataChanged(() => {
      void reload()
    })
  }, [reload])
}
