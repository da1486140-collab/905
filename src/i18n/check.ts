import { en } from './en'
import { ar } from './ar'

type Dict = typeof en

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Record<string, unknown>, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

const enKeys = new Set(collectKeys(en as unknown as Record<string, unknown>))
const arKeys = new Set(collectKeys(ar as unknown as Record<string, unknown>))

const missingInAr = [...enKeys].filter((k) => !arKeys.has(k))
const missingInEn = [...arKeys].filter((k) => !enKeys.has(k))

if (missingInAr.length > 0) {
  console.error('Missing keys in ar.ts:')
  missingInAr.forEach((k) => console.error(`  - ${k}`))
}
if (missingInEn.length > 0) {
  console.error('Missing keys in en.ts:')
  missingInEn.forEach((k) => console.error(`  - ${k}`))
}

if (missingInAr.length > 0 || missingInEn.length > 0) {
  process.exit(1)
} else {
  console.log('i18n keys are consistent across en and ar.')
}
