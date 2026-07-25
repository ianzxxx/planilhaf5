# Ponto Escritório

Aplicativo desktop (Electron) de controle de ponto manual/semi-automático para secretária de escritório. Funciona offline, com SQLite local, exportação Excel e backup para pasta sincronizada (Drive/OneDrive/Dropbox).

## Stack

- Electron + React + Vite + TypeScript
- Tailwind CSS
- Prisma + SQLite (`app.getPath('userData')`)
- SheetJS (xlsx)
- electron-builder + electron-updater (GitHub Releases privados)

## Desenvolvimento

```bash
npm install
npm run dev
```

Login inicial (criado automaticamente na primeira abertura):

- E-mail: `secretaria@escritorio.local`
- Senha: `secretaria123`

## Build / instalação

```bash
# Linux (.AppImage / .deb)
npm run dist:linux

# Windows (.exe NSIS) — idealmente em máquina Windows ou CI
npm run dist:win
```

Artefatos em `release/`.

## Publicar atualização (repo privado)

1. Crie o repositório privado no GitHub.
2. Gere um Personal Access Token com permissão de leitura de Releases (e escrita para publicar).
3. Exporte as variáveis e publique:

```bash
export GH_TOKEN=...
export GH_OWNER=seu-usuario
export GH_REPO=ponto-escritorio
npm run release
```

O app instalado chama `autoUpdater.checkForUpdatesAndNotify()` na abertura.

> No Windows, sem certificado de assinatura de código, o SmartScreen pode mostrar “Editor desconhecido”. Oriente a secretária a usar “Mais informações” → “Executar assim mesmo” na primeira instalação.

## Backup

Em **Configurações**, escolha uma pasta (preferencialmente sincronizada). O app copia o `.db` na abertura (no máximo 1× por dia) e mantém os últimos 14 backups datados + `ponto-backup-recente.db`.

## Estrutura

```
src/main      → processo principal, Prisma, IPC, backup, updater
src/preload   → contextBridge (window.api)
src/renderer  → React (login, lançamento, planilha, funcionários, config)
src/shared    → tipos e cálculo de horas
prisma        → schema SQLite
```
