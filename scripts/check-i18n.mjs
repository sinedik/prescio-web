#!/usr/bin/env node
// Проверяет: дубликаты ключей, пустые переводы, missing en/ru.
// Запуск: node scripts/check-i18n.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.resolve(__dirname, '../src/lib/i18n.ts')

const source = fs.readFileSync(FILE, 'utf8')

// Собираем все строки вида:  'key.path': { en: '...', ru: '...' },
const entryRe = /^\s*['"]([a-z0-9_.-]+)['"]\s*:\s*\{\s*en:\s*(['"`])((?:\\.|(?!\2).)*)\2\s*,\s*ru:\s*(['"`])((?:\\.|(?!\4).)*)\4\s*\}/gim
const seen = new Map()
const problems = []

let m
while ((m = entryRe.exec(source)) !== null) {
  const key = m[1]
  const en = m[3]
  const ru = m[5]
  const line = source.slice(0, m.index).split('\n').length

  if (seen.has(key)) {
    problems.push(`DUPLICATE: '${key}' at line ${line} (first at line ${seen.get(key)})`)
  } else {
    seen.set(key, line)
  }
  if (!en.trim()) problems.push(`EMPTY en: '${key}' at line ${line}`)
  if (!ru.trim()) problems.push(`EMPTY ru: '${key}' at line ${line}`)
}

if (problems.length) {
  console.error(`i18n check failed (${problems.length} issue${problems.length > 1 ? 's' : ''}):`)
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}

console.log(`i18n OK — ${seen.size} keys, no duplicates`)
