import { BrowserWindow, dialog } from 'electron'
import fs from 'fs'
import * as XLSX from 'xlsx'
import type { RegistroPonto, RelatorioMensal } from '../shared/types'
import { formatarHoras } from '../shared/hours'

function formatarDataBr(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export async function exportarPontosXlsx(
  registros: RegistroPonto[],
  parent: BrowserWindow | null
): Promise<{ canceled: boolean; filePath?: string }> {
  const ordenados = [...registros].sort((a, b) => {
    const byData = a.data.localeCompare(b.data)
    if (byData !== 0) return byData
    return (a.funcionario?.nome ?? '').localeCompare(b.funcionario?.nome ?? '')
  })

  const rows: Array<Record<string, string>> = []
  let dataAtual = ''

  for (const r of ordenados) {
    if (r.data !== dataAtual) {
      dataAtual = r.data
      rows.push({
        Data: formatarDataBr(r.data),
        Funcionário: '',
        Entrada: '',
        'Saiu almoço': '',
        Voltou: '',
        Saída: '',
        Horas: '',
        Obs: ''
      })
    }

    const trabalho = r.tipoDia === 'trabalho'
    rows.push({
      Data: '',
      Funcionário: r.funcionario?.nome ?? '',
      Entrada: trabalho ? (r.horaEntrada ?? '') : '',
      'Saiu almoço': trabalho ? (r.horaSaidaAlmoco ?? '') : '',
      Voltou: trabalho ? (r.horaVoltaAlmoco ?? '') : '',
      Saída: trabalho ? (r.horaSaida ?? '') : '',
      Horas:
        r.horasTrabalhadas == null ? '' : formatarHoras(r.horasTrabalhadas),
      Obs: r.observacao ?? ''
    })
  }

  const total = registros.reduce((acc, r) => acc + (r.horasTrabalhadas ?? 0), 0)
  rows.push({
    Data: '',
    Funcionário: 'TOTAL',
    Entrada: '',
    'Saiu almoço': '',
    Voltou: '',
    Saída: '',
    Horas: formatarHoras(total),
    Obs: ''
  })

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 28 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 40 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pontos')

  const options = {
    title: 'Exportar planilha de pontos',
    defaultPath: `pontos-${new Date().toISOString().slice(0, 10)}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  }

  const result = parent
    ? await dialog.showSaveDialog(parent, options)
    : await dialog.showSaveDialog(options)

  if (result.canceled || !result.filePath) {
    return { canceled: true }
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  fs.writeFileSync(result.filePath, buffer)

  return { canceled: false, filePath: result.filePath }
}

export async function exportarRelatorioMensalXlsx(
  relatorio: RelatorioMensal,
  parent: BrowserWindow | null
): Promise<{ canceled: boolean; filePath?: string }> {
  const mesLabel = String(relatorio.mes).padStart(2, '0')
  const rows = relatorio.linhas.map((l) => ({
    Funcionário: l.nome,
    Cargo: l.cargo ?? '',
    'Dias trabalhados': l.diasTrabalhados,
    Faltas: l.faltas,
    Folgas: l.folgas,
    Atestados: l.atestados,
    Horas: formatarHoras(l.totalHoras),
    'Média/dia':
      l.mediaHorasPorDiaTrabalhado == null
        ? ''
        : formatarHoras(l.mediaHorasPorDiaTrabalhado)
  }))

  rows.push({
    Funcionário: 'TOTAL',
    Cargo: '',
    'Dias trabalhados': relatorio.totais.diasTrabalhados,
    Faltas: relatorio.totais.faltas,
    Folgas: relatorio.totais.folgas,
    Atestados: relatorio.totais.atestados,
    Horas: formatarHoras(relatorio.totais.totalHoras),
    'Média/dia': ''
  })

  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [
    { wch: 28 },
    { wch: 22 },
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório')

  const options = {
    title: 'Exportar relatório mensal',
    defaultPath: `relatorio-${relatorio.ano}-${mesLabel}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  }

  const result = parent
    ? await dialog.showSaveDialog(parent, options)
    : await dialog.showSaveDialog(options)

  if (result.canceled || !result.filePath) {
    return { canceled: true }
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  fs.writeFileSync(result.filePath, buffer)

  return { canceled: false, filePath: result.filePath }
}
