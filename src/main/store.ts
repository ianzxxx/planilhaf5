import Store from 'electron-store'

export interface AppStoreSchema {
  pastaBackup: string | null
  ultimoBackupEm: string | null
}

export const store = new Store<AppStoreSchema>({
  name: 'ponto-config',
  defaults: {
    pastaBackup: null,
    ultimoBackupEm: null
  }
})
