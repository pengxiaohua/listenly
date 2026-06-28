import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

type ExportScope = 'vocabulary' | 'wrong'
type ExportItemType = 'word' | 'sentence'
type ExportFormat = 'pdf' | 'word' | 'excel'
type ExportContent = 'both' | 'term' | 'translation'

type ExportItem = {
  term: string
  translation: string
  createdAt: Date
}

const formatLabels: Record<ExportFormat, string> = {
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
}

const scopeLabels: Record<ExportScope, string> = {
  vocabulary: '生词本',
  wrong: '错词本',
}

const typeLabels: Record<ExportItemType, string> = {
  word: '单词',
  sentence: '句子',
}

function isExportScope(value: string | null): value is ExportScope {
  return value === 'vocabulary' || value === 'wrong'
}

function isExportItemType(value: string | null): value is ExportItemType {
  return value === 'word' || value === 'sentence'
}

function isExportFormat(value: string | null): value is ExportFormat {
  return value === 'pdf' || value === 'word' || value === 'excel'
}

function isExportContent(value: string | null): value is ExportContent {
  return value === 'both' || value === 'term' || value === 'translation'
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeExportText(value: string | null | undefined) {
  const normalized = (value || '-')
    .replace(/\r\n?/g, '\n')
    .replace(/\\n/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')

  return normalized || '-'
}

function escapeHtmlWithBreaks(value: string) {
  return escapeXml(normalizeExportText(value)).replace(/\n/g, '<br />')
}

function getTitle(scope: ExportScope, itemType: ExportItemType) {
  return `${scopeLabels[scope]}-${typeLabels[itemType]}`
}

function getFileName(scope: ExportScope, itemType: ExportItemType, format: ExportFormat) {
  const ext = format === 'word' ? 'doc' : format === 'excel' ? 'xls' : 'pdf'
  const date = new Date().toISOString().slice(0, 10)
  return `listenly-${getTitle(scope, itemType)}-${date}.${ext}`
}

function getColumns(itemType: ExportItemType, content: ExportContent) {
  const termLabel = itemType === 'word' ? '单词' : '句子'
  const columns = ['序号']
  if (content === 'both' || content === 'term') columns.push(termLabel)
  if (content === 'both' || content === 'translation') columns.push('翻译')
  return columns
}

function itemToCells(item: ExportItem, index: number, content: ExportContent) {
  const cells = [String(index + 1)]
  if (content === 'both' || content === 'term') cells.push(normalizeExportText(item.term))
  if (content === 'both' || content === 'translation') cells.push(normalizeExportText(item.translation))
  return cells
}

async function getVocabularyItems(userId: string, itemType: ExportItemType): Promise<ExportItem[]> {
  const rows = await prisma.vocabulary.findMany({
    where: {
      userId,
      type: itemType,
      isMastered: false,
    },
    include: {
      word: itemType === 'word',
      sentence: itemType === 'sentence',
    },
    orderBy: { createdAt: 'desc' },
  })

  return rows.map(row => ({
    term: itemType === 'word' ? row.word?.word || '' : row.sentence?.text || '',
    translation: itemType === 'word' ? row.word?.translation || '' : row.sentence?.translation || '',
    createdAt: row.createdAt,
  }))
}

async function getWrongWordItems(userId: string): Promise<ExportItem[]> {
  type GroupedResult = {
    wordId: string
    _max: {
      lastAttempt: Date | null
      id: string | null
    }
  }

  const groupedRaw = await prisma.wordRecord.groupBy({
    by: ['wordId'],
    where: {
      userId,
      errorCount: { gt: 0 },
      isMastered: false,
      archived: false,
    },
    _max: {
      lastAttempt: true,
      id: true,
    },
  })

  const grouped = groupedRaw as unknown as GroupedResult[]
  grouped.sort((a, b) => {
    const timeA = a._max.lastAttempt ? new Date(a._max.lastAttempt).getTime() : 0
    const timeB = b._max.lastAttempt ? new Date(b._max.lastAttempt).getTime() : 0
    return timeB - timeA
  })

  const recordIds = grouped.map(group => group._max.id).filter((id): id is string => id !== null)
  if (recordIds.length === 0) return []

  type WordRecordWithWord = Prisma.WordRecordGetPayload<{ include: { word: true } }>
  const records = await prisma.wordRecord.findMany({
    where: { id: { in: recordIds } },
    include: { word: true },
  })

  const recordMap = new Map<string, WordRecordWithWord>(records.map(record => [record.id, record]))
  return recordIds
    .map(id => recordMap.get(id))
    .filter((record): record is WordRecordWithWord => !!record)
    .map(record => ({
      term: record.word?.word || '',
      translation: record.word?.translation || '',
      createdAt: record.lastAttempt || record.createdAt,
    }))
}

async function getWrongSentenceItems(userId: string): Promise<ExportItem[]> {
  type GroupedSentenceResult = {
    sentenceId: number
    _max: {
      createdAt: Date | null
      id: number | null
    }
  }

  const groupedRaw = await prisma.sentenceRecord.groupBy({
    by: ['sentenceId'],
    where: {
      userId,
      errorCount: { gt: 0 },
      isMastered: false,
      archived: false,
    },
    _max: {
      createdAt: true,
      id: true,
    },
  })

  const grouped = groupedRaw as unknown as GroupedSentenceResult[]
  grouped.sort((a, b) => {
    const timeA = a._max.createdAt ? new Date(a._max.createdAt).getTime() : 0
    const timeB = b._max.createdAt ? new Date(b._max.createdAt).getTime() : 0
    return timeB - timeA
  })

  const recordIds = grouped.map(group => group._max.id).filter((id): id is number => id !== null)
  if (recordIds.length === 0) return []

  type SentenceRecordWithSentence = Prisma.SentenceRecordGetPayload<{ include: { sentence: true } }>
  const records = await prisma.sentenceRecord.findMany({
    where: { id: { in: recordIds } },
    include: { sentence: true },
  })

  const recordMap = new Map<number, SentenceRecordWithSentence>(records.map(record => [record.id, record]))
  return recordIds
    .map(id => recordMap.get(id))
    .filter((record): record is SentenceRecordWithSentence => !!record)
    .map(record => ({
      term: record.sentence?.text || '',
      translation: record.sentence?.translation || '',
      createdAt: record.createdAt,
    }))
}

async function getExportItems(userId: string, scope: ExportScope, itemType: ExportItemType) {
  if (scope === 'vocabulary') {
    return getVocabularyItems(userId, itemType)
  }

  return itemType === 'word'
    ? getWrongWordItems(userId)
    : getWrongSentenceItems(userId)
}

function buildWordEntry(item: ExportItem, content: ExportContent) {
  if (content === 'both') {
    return `<div class="entry">
      <span class="term">${escapeHtmlWithBreaks(item.term)}</span>
      <span class="separator">&nbsp;&nbsp;&nbsp;</span>
      <span class="translation">${escapeHtmlWithBreaks(item.translation)}</span>
    </div>`
  }

  const text = content === 'term' ? item.term : item.translation
  const className = content === 'term' ? 'term' : 'translation solo'
  return `<div class="entry">
    <span class="${className}">${escapeHtmlWithBreaks(text)}</span>
  </div>`
}

function buildWordDocument(title: string, content: ExportContent, items: ExportItem[]) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeXml(title)}</title>
  <style>
    body { font-family: "Microsoft YaHei", Arial, sans-serif; color: #1f2937; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    .meta { color: #64748b; margin-bottom: 16px; }
    .entry { margin: 0 0 14px; line-height: 1.65; page-break-inside: avoid; }
    .term { font-weight: 600; word-break: break-word; }
    .separator { color: #94a3b8; }
    .translation { color: #334155; word-break: break-word; }
    .translation.solo { margin-left: 0; }
  </style>
</head>
<body>
  <h1>${escapeXml(title)}</h1>
  <div class="meta">共 ${items.length} 条</div>
  ${items.map(item => buildWordEntry(item, content)).join('')}
</body>
</html>`
}

function buildExcelDocument(title: string, itemType: ExportItemType, content: ExportContent, items: ExportItem[]) {
  const columns = getColumns(itemType, content)
  const header = columns.map(col => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(col)}</Data></Cell>`).join('')
  const rows = items.map((item, index) => (
    `<Row>${itemToCells(item, index, content).map(cell => `<Cell ss:StyleID="wrap"><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join('')}</Row>`
  )).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Title>${escapeXml(title)}</Title>
    <Created>${new Date().toISOString()}</Created>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
    </Style>
    <Style ss:ID="wrap">
      <Alignment ss:Vertical="Top" ss:WrapText="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXml(title).slice(0, 28)}">
    <Table>
      <Row>${header}</Row>
      ${rows}
    </Table>
  </Worksheet>
</Workbook>`
}

type PdfFontKey = 'latin' | 'cjk'
type PdfRun = { text: string; font: PdfFontKey }
type PdfLine = { runs?: PdfRun[]; size: number; gap?: number; x?: number }
type PdfPlacedLine = { runs: PdfRun[]; size: number; y: number; x: number }

function getPdfFont(char: string): PdfFontKey {
  return char.charCodeAt(0) <= 0x7e ? 'latin' : 'cjk'
}

function measurePdfChar(char: string, size: number) {
  if (char.charCodeAt(0) > 0x7e) return size
  if (char === ' ') return size * 0.28
  if (/[A-Z]/.test(char)) return size * 0.65
  if (/[a-z0-9]/.test(char)) return size * 0.55
  return size * 0.36
}

function measurePdfText(text: string, size: number) {
  return Array.from(text).reduce((sum, char) => sum + measurePdfChar(char, size), 0)
}

function pushPdfChar(runs: PdfRun[], char: string) {
  const font = getPdfFont(char)
  const last = runs[runs.length - 1]
  if (last && last.font === font) {
    last.text += char
  } else {
    runs.push({ text: char, font })
  }
}

function addWrappedPdfLines(
  lines: PdfLine[],
  text: string,
  options: { size: number; maxWidth: number; gap?: number; x?: number }
) {
  normalizeExportText(text).split('\n').forEach((paragraph, paragraphIndex) => {
    let runs: PdfRun[] = []
    let width = 0
    let hasPushedLine = false

    for (const char of Array.from(paragraph)) {
      const charWidth = measurePdfChar(char, options.size)
      if (width + charWidth > options.maxWidth && runs.length > 0) {
        lines.push({
          runs,
          size: options.size,
          gap: paragraphIndex === 0 && !hasPushedLine ? options.gap : 0,
          x: options.x,
        })
        runs = []
        width = 0
        hasPushedLine = true
      }

      if (char === ' ' && runs.length === 0) continue
      pushPdfChar(runs, char)
      width += charWidth
    }

    if (runs.length > 0) {
      lines.push({
        runs,
        size: options.size,
        gap: paragraphIndex === 0 && !hasPushedLine ? options.gap : 0,
        x: options.x,
      })
    }
  })
}

function toUtf16Hex(text: string) {
  const buffer = Buffer.from(text, 'utf16le')
  const bytes: number[] = []
  for (let i = 0; i < buffer.length; i += 2) {
    bytes.push(buffer[i + 1], buffer[i])
  }
  return Buffer.from(bytes).toString('hex').toUpperCase()
}

function escapePdfLiteral(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '')
    .replace(/\n/g, ' ')
}

function renderPdfRun(run: PdfRun, x: number, y: number, size: number) {
  if (run.font === 'latin') {
    return `BT /F2 ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfLiteral(run.text)}) Tj ET`
  }

  return `BT /F1 ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm <${toUtf16Hex(run.text)}> Tj ET`
}

function buildPdfDocument(title: string, content: ExportContent, items: ExportItem[]) {
  const pageHeight = 842
  const pageWidth = 595
  const marginX = 44
  const topY = 792
  const bottomY = 50
  const maxLineWidth = pageWidth - marginX * 2

  const lines: PdfLine[] = []
  addWrappedPdfLines(lines, title, { size: 18, maxWidth: maxLineWidth, gap: 10, x: marginX })
  addWrappedPdfLines(lines, `共 ${items.length} 条`, { size: 10, maxWidth: maxLineWidth, gap: 16, x: marginX })

  items.forEach((item) => {
    if (content === 'both') {
      const term = normalizeExportText(item.term)
      const translation = normalizeExportText(item.translation).replace(/\n+/g, ' ')
      addWrappedPdfLines(lines, `${term}   ${translation}`, {
        size: 11,
        maxWidth: maxLineWidth,
        gap: 3,
        x: marginX,
      })
    } else {
      const text = content === 'term' ? item.term || '-' : item.translation || '-'
      addWrappedPdfLines(lines, text, {
        size: 11,
        maxWidth: maxLineWidth,
        gap: 3,
        x: marginX,
      })
    }
    lines.push({ size: 6, gap: 2 })
  })

  const pages: Array<PdfPlacedLine[]> = []
  let page: PdfPlacedLine[] = []
  let y = topY

  for (const line of lines) {
    const hasText = !!line.runs?.length
    const advance = hasText ? line.size + 6 + (line.gap || 0) : line.size + (line.gap || 0)
    if (y - advance < bottomY && page.length > 0) {
      pages.push(page)
      page = []
      y = topY
    }
    if (hasText && line.runs) {
      page.push({ runs: line.runs, size: line.size, y, x: line.x || marginX })
    }
    y -= advance
  }
  if (page.length > 0) pages.push(page)
  if (pages.length === 0) {
    const emptyRuns: PdfRun[] = Array.from('暂无可导出内容').map(char => ({ text: char, font: getPdfFont(char) }))
    pages.push([{ runs: emptyRuns, size: 12, y: topY, x: marginX }])
  }

  const objects: string[] = [
    '',
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [4 0 R] >>',
    '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 2 >> /DW 1000 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  const pageIds: number[] = []
  for (const pageLines of pages) {
    const pageId = objects.length
    const contentId = objects.length + 1
    pageIds.push(pageId)
    const stream = pageLines.map(line => {
      let x = line.x
      return line.runs.map(run => {
        const output = renderPdfRun(run, x, line.y, line.size)
        x += measurePdfText(run.text, line.size)
        return output
      }).join('\n')
    }).join('\n')

    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 5 0 R >> >> /Contents ${contentId} 0 R >>`)
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`)
  }

  objects[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = Buffer.byteLength(pdf, 'utf8')
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let i = 1; i < objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf, 'utf8')
}

function buildFile(format: ExportFormat, title: string, itemType: ExportItemType, content: ExportContent, items: ExportItem[]) {
  if (format === 'word') {
    return {
      body: Buffer.from(buildWordDocument(title, content, items), 'utf8'),
      contentType: 'application/msword; charset=utf-8',
    }
  }

  if (format === 'excel') {
    return {
      body: Buffer.from(buildExcelDocument(title, itemType, content, items), 'utf8'),
      contentType: 'application/vnd.ms-excel; charset=utf-8',
    }
  }

  return {
    body: buildPdfDocument(title, content, items),
    contentType: 'application/pdf',
  }
}

export async function GET(request: NextRequest) {
  const user = await auth()
  if (!user) {
    return NextResponse.json({ error: '用户未登录' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope')
  const itemType = searchParams.get('type')
  const format = searchParams.get('format')
  const contentParam = searchParams.get('content')
  const preview = searchParams.get('preview') === 'true'

  if (!isExportScope(scope) || !isExportItemType(itemType)) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 })
  }

  const content: ExportContent = isExportContent(contentParam) ? contentParam : 'both'
  const items = await getExportItems(user.id, scope, itemType)
  const title = getTitle(scope, itemType)

  if (preview) {
    return NextResponse.json({
      success: true,
      title,
      total: items.length,
      data: items.map((item, index) => ({
        id: index + 1,
        term: normalizeExportText(item.term),
        translation: normalizeExportText(item.translation),
        createdAt: item.createdAt.toISOString(),
      })),
    })
  }

  if (!isExportFormat(format)) {
    return NextResponse.json({ error: '下载格式错误' }, { status: 400 })
  }

  const fileName = getFileName(scope, itemType, format)
  const file = buildFile(format, `${title} ${formatLabels[format]}导出`, itemType, content, items)

  return new NextResponse(file.body, {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="listenly-export.${fileName.split('.').pop()}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'no-store',
    },
  })
}
