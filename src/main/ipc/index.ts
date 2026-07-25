import { registerAuthHandlers } from './auth'
import { registerFuncionarioHandlers } from './funcionarios'
import { registerPontoHandlers } from './pontos'
import { registerConfigHandlers } from './config'
import { registerExportHandlers } from './export'

export function registerAllIpcHandlers(): void {
  registerAuthHandlers()
  registerFuncionarioHandlers()
  registerPontoHandlers()
  registerConfigHandlers()
  registerExportHandlers()
}
