import { BrowserWindow, dialog } from 'electron'
import fs from 'fs'
import * as XLSX from 'xlsx'
import type { RegistroPonto } from '../shared/types'
import { formatarHoras } from '../shared/hours'

function formatarDataBr(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export async function exportarPontosXlsx(
  registros: RegistroPonto[],
  parent: BrowserWindow | null
): Promise<{ canceled: boolean; filePath?: string }> {
  const rows = registros.map((r) => ({
    Data: formatarDataBr(r.data),
    Funcionário: r.funcionario?.nome ?? '',
    Entrada: r.horaEntrada,
    Saída: r.horaSaida,
    'Horas Trabalhadas': formatarHoras(r.horasTrabalhadas),
    'Horas (decimal)': r.horasTrabalhadas,
    Observação: r.observacao ?? ''
  }))

  const total = registros.reduce((acc, r) => acc + r.horasTrabalhadas, 0)
  rows.push({
    Data: '',
    Funcionário: 'TOTAL',
    Entrada: '',
    Saída: '',
    'Horas Trabalhadas': formatarHoras(total),
    'Horas (decimal)': total,
    Observação: ''
  })

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 28 },
    { wch: 10 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 40 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pontos')

  const result = await dialog.showSaveDialog(parent ?? undefined, {
    title: 'Exportar planilha de pontos',
    defaultPath: `pontos-${new Date().toISOString().slice(0, 10)}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  })

  if (result.canceled || !result.filePath) {
    return { canceled: true }
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  fs.writeFileSync(result.filePath, buffer)

  return { canceled: false, filePath: result.filePath }
}
