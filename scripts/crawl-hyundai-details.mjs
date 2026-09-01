import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const DATA_PATH = path.resolve('public/data/products.json')
const TARGET_BRAND = '현대큐밍'
const CONCURRENCY = 2
const REQUEST_DELAY_MS = 300
const MAX_ATTEMPTS = 3
const DRY_RUN = process.argv.includes('--dry-run')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function decodeHtmlAttribute(value = '') {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .trim()
}

function extractDetailImages(html, pageUrl) {
  const images = []
  const pattern = /\bec-data-src\s*=\s*["']([^"']+)["']/gi

  for (const match of html.matchAll(pattern)) {
    const raw = decodeHtmlAttribute(match[1])
    if (!raw || raw.startsWith('data:')) continue

    try {
      const absolute = new URL(raw, pageUrl).href
      if (!/\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(absolute)) continue
      images.push(absolute)
    } catch {
      // 잘못된 이미지 주소는 건너뛰고 다른 상품 수집을 계속한다.
    }
  }

  return [...new Set(images)]
}

async function fetchHtml(url) {
  let lastError

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          Referer: 'https://www.hdquming.com/',
          'User-Agent': 'Mozilla/5.0 (compatible; ALLRentalCatalog/1.0)',
        },
        redirect: 'follow',
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.text()
    } catch (error) {
      lastError = error
      if (attempt < MAX_ATTEMPTS) await sleep(attempt * 800)
    }
  }

  throw lastError
}

async function crawlProduct(product) {
  const url = String(product.detail_url || '').trim()
  if (!url) return { status: 'skipped', reason: '상세 URL 없음', product }

  const parsed = new URL(url)
  if (!/(^|\.)hdquming\.com$/i.test(parsed.hostname)) {
    return { status: 'skipped', reason: '현대큐밍 URL 아님', product }
  }

  const html = await fetchHtml(url)
  const images = extractDetailImages(html, url)

  if (images.length === 0) {
    return { status: 'preserved', reason: 'ec-data-src 없음', product }
  }

  const previous = Array.isArray(product.detail_description_images)
    ? product.detail_description_images
    : []
  const changed = JSON.stringify(previous) !== JSON.stringify(images)

  product.detail_description_images = images
  return { status: changed ? 'updated' : 'unchanged', images: images.length, product }
}

async function main() {
  const products = JSON.parse(await readFile(DATA_PATH, 'utf8'))
  const targets = products.filter((product) => product.brand === TARGET_BRAND)
  const results = new Array(targets.length)
  let cursor = 0

  async function worker() {
    while (cursor < targets.length) {
      const index = cursor
      cursor += 1
      const product = targets[index]

      try {
        results[index] = await crawlProduct(product)
      } catch (error) {
        results[index] = {
          status: 'failed',
          reason: error instanceof Error ? error.message : String(error),
          product,
        }
      }

      await sleep(REQUEST_DELAY_MS)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  const counts = results.reduce((summary, result) => {
    summary[result.status] = (summary[result.status] || 0) + 1
    return summary
  }, {})
  const failures = results
    .filter((result) => result.status === 'failed' || result.status === 'preserved')
    .map((result) => ({
      name: result.product.name,
      model: result.product.model_code,
      status: result.status,
      reason: result.reason,
    }))

  if (!DRY_RUN) {
    await writeFile(DATA_PATH, `${JSON.stringify(products, null, 2)}\n`, 'utf8')
  }

  console.log(JSON.stringify({
    dryRun: DRY_RUN,
    targetBrand: TARGET_BRAND,
    total: targets.length,
    counts,
    failures,
  }, null, 2))

  if (counts.failed === targets.length) process.exitCode = 1
}

await main()
