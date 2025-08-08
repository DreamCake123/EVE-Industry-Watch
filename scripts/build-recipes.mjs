import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const CSV_FILES = [
  'industryActivityMaterials.csv',
  'industryActivityProducts.csv',
  'invTypes.csv'
]

const sourceResolvers = [
  (p) => path.join(root, 'server', 'assets', p),
  (p) => path.join(root, 'assets', p),
  (p) => path.join(root, 'scripts', 'data', p)
]

async function fileExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function locateFile(name) {
  for (const resolver of sourceResolvers) {
    const p = resolver(name)
    if (await fileExists(p)) return p
  }
  return null
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true })
}

async function convertCsvToJson(csvName) {
  const src = await locateFile(csvName)
  if (!src) {
    console.warn(`[build-recipes] Source not found: ${csvName}`)
    return
  }

  const outDir = path.join(root, 'server', 'assets')
  await ensureDir(outDir)

  const csv = await fs.readFile(src, 'utf-8')
  const records = parse(csv, { columns: true, skip_empty_lines: true })

  const base = path.basename(csvName, '.csv')
  const outPath = path.join(outDir, `${base}.json`)
  await fs.writeFile(outPath, JSON.stringify(records), 'utf-8')
  console.log(`[build-recipes] Wrote ${outPath} (${records.length} rows)`) 
}

async function main() {
  for (const f of CSV_FILES) {
    await convertCsvToJson(f)
  }
}

main().catch((err) => {
  console.error('[build-recipes] Failed:', err)
  process.exit(1)
})
