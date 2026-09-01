import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const DATA_PATH = path.resolve('public/data/products.json')
const TARGET_BRAND = '청호나이스'
const DIRECT_HOST = 'chungho-direct.com'
const CONCURRENCY = 2
const REQUEST_DELAY_MS = 350
const MAX_ATTEMPTS = 3
const DRY_RUN = process.argv.includes('--dry-run')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))
  return match ? decodeHtml(match[2].trim()) : ''
}

function getDetailTab(html) {
  const startMatch = /<div\b[^>]*\bid=["']tab-responsive-1["'][^>]*>/i.exec(html)
  if (!startMatch) return ''

  const start = startMatch.index + startMatch[0].length
  const rest = html.slice(start)
  const endMatch = /<div\b[^>]*\bid=["']tab-responsive-2["'][^>]*>/i.exec(rest)
  return endMatch ? rest.slice(0, endMatch.index) : rest
}

function isProductDetailImage(url) {
  const pathname = url.pathname.toLowerCase()
  const filename = pathname.split('/').pop() || ''

  if (!/\.(?:avif|gif|jpe?g|png|webp)$/i.test(pathname)) return false
  if (/\/(?:bnr|banner|event|gift|coupon)\//i.test(pathname)) return false
  if (/(?:certification|navertalk|kakao|card|benefit|procedure|warn)/i.test(filename)) return false
  if (/^(?:mp|logo)\.(?:jpe?g|png|webp|gif)$/i.test(filename)) return false

  return pathname.includes('/a/ch/prd/') ||
    pathname.includes('/web/upload/nneditor/') ||
    pathname.includes('/web/upload/editor/')
}

function extractDetailImages(html, pageUrl) {
  const detailTab = getDetailTab(html)
  if (!detailTab) return []

  const urls = []
  for (const match of detailTab.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0]
    const raw = getAttribute(tag, 'ec-data-src') ||
      getAttribute(tag, 'data-src') ||
      getAttribute(tag, 'src')

    if (!raw || raw.startsWith('data:')) continue

    try {
      const url = new URL(raw, pageUrl)
      if (isProductDetailImage(url)) urls.push(url.href)
    } catch {
      // Ignore malformed image attributes from the source page.
    }
  }

  return [...new Set(urls)]
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      Referer: 'https://chungho-direct.com/',
      'User-Agent': 'Mozilla/5.0 (compatible; AllRentalDetailImageUpdater/1.0)',
    },
    redirect: 'follow',
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return { html: await response.text(), finalUrl: response.url }
}

async function crawlDirectProduct(product) {
  let lastError

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const { html, finalUrl } = await fetchHtml(product.detail_url)
      const finalHost = new URL(finalUrl).hostname.replace(/^www\./, '')
      if (finalHost !== DIRECT_HOST) throw new Error(`예상하지 못한 이동 주소: ${finalUrl}`)

      return {
        status: 'updated',
        images: extractDetailImages(html, finalUrl),
      }
    } catch (error) {
      lastError = error
      if (attempt < MAX_ATTEMPTS) await sleep(REQUEST_DELAY_MS * attempt)
    }
  }

  throw new Error(`${product.name}: ${lastError?.message || '수집 실패'}`)
}

async function main() {
  const products = JSON.parse(await readFile(DATA_PATH, 'utf8'))
  const targetIndexes = products
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => product.brand === TARGET_BRAND)

  const directTargets = targetIndexes.filter(({ product }) => {
    try {
      return new URL(product.detail_url).hostname.replace(/^www\./, '') === DIRECT_HOST
    } catch {
      return false
    }
  })

  const results = []
  let cursor = 0

  async function worker() {
    while (cursor < directTargets.length) {
      const current = directTargets[cursor]
      cursor += 1
      const result = await crawlDirectProduct(current.product)
      results.push({ ...current, ...result })
      await sleep(REQUEST_DELAY_MS)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  for (const { index, images } of results) {
    products[index].detail_description_images = images
  }

  const directIndexes = new Set(directTargets.map(({ index }) => index))
  const cleared = []
  for (const { product, index } of targetIndexes) {
    if (directIndexes.has(index)) continue
    products[index].detail_description_images = []
    cleared.push({ name: product.name, detail_url: product.detail_url || '' })
  }

  if (!DRY_RUN) {
    await writeFile(DATA_PATH, `${JSON.stringify(products, null, 2)}\n`, 'utf8')
  }

  const withImages = results.filter(({ images }) => images.length > 0)
  const withoutImages = results.filter(({ images }) => images.length === 0)
  const summary = {
    dryRun: DRY_RUN,
    targetBrand: TARGET_BRAND,
    total: targetIndexes.length,
    directPages: directTargets.length,
    updatedWithImages: withImages.length,
    directPagesWithoutImages: withoutImages.map(({ product }) => product.name),
    unsupportedOrMissingUrlCleared: cleared.length,
    totalImages: withImages.reduce((sum, { images }) => sum + images.length, 0),
    sample: withImages.slice(0, 8).map(({ product, images }) => ({
      name: product.name,
      count: images.length,
      images,
    })),
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
