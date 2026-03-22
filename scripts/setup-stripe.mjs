// Run with: node scripts/setup-stripe.mjs
import https from 'https'
import querystring from 'querystring'

// Load from environment — never hardcode secrets in source files
// Set STRIPE_SECRET_KEY in .env.local before running
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env.local') })
const SK = process.env.STRIPE_SECRET_KEY
if (!SK) { console.error('Missing STRIPE_SECRET_KEY in .env.local'); process.exit(1) }

function stripePost(path, data) {
  return new Promise((resolve, reject) => {
    const body = querystring.stringify(data)
    const options = {
      hostname: 'api.stripe.com',
      path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SK}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }
    const req = https.request(options, (res) => {
      let raw = ''
      res.on('data', chunk => raw += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(raw)) } catch { reject(new Error(raw)) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function main() {
  console.log('Creating Fotonizer Stripe products & prices...\n')

  // ── Products ──────────────────────────────────────────────────────────────
  const starter = await stripePost('/v1/products', {
    name: 'Fotonizer Starter',
    description: 'Für wachsende Studios — bis zu 10 Kunden, 150 GB Speicher',
  })
  console.log('✅ Starter product:', starter.id)

  const pro = await stripePost('/v1/products', {
    name: 'Fotonizer Pro',
    description: 'Für professionelle Fotografen — unbegrenzte Kunden, 1 TB Speicher',
  })
  console.log('✅ Pro product:', pro.id)

  const studio = await stripePost('/v1/products', {
    name: 'Fotonizer Studio',
    description: 'Für Teams & Agenturen — bis zu 3 Fotografen-Accounts, 3 TB Speicher',
  })
  console.log('✅ Studio product:', studio.id)

  // ── Prices ────────────────────────────────────────────────────────────────
  const starterMonthly = await stripePost('/v1/prices', {
    product: starter.id,
    unit_amount: 1700,
    currency: 'eur',
    'recurring[interval]': 'month',
    nickname: 'Starter Monthly',
  })
  console.log('✅ Starter monthly:', starterMonthly.id)

  const starterAnnual = await stripePost('/v1/prices', {
    product: starter.id,
    unit_amount: 16000,
    currency: 'eur',
    'recurring[interval]': 'year',
    nickname: 'Starter Annual',
  })
  console.log('✅ Starter annual:', starterAnnual.id)

  const proMonthly = await stripePost('/v1/prices', {
    product: pro.id,
    unit_amount: 2400,
    currency: 'eur',
    'recurring[interval]': 'month',
    nickname: 'Pro Monthly',
  })
  console.log('✅ Pro monthly:', proMonthly.id)

  const proAnnual = await stripePost('/v1/prices', {
    product: pro.id,
    unit_amount: 23000,
    currency: 'eur',
    'recurring[interval]': 'year',
    nickname: 'Pro Annual',
  })
  console.log('✅ Pro annual:', proAnnual.id)

  const studioMonthly = await stripePost('/v1/prices', {
    product: studio.id,
    unit_amount: 6900,
    currency: 'eur',
    'recurring[interval]': 'month',
    nickname: 'Studio Monthly',
  })
  console.log('✅ Studio monthly:', studioMonthly.id)

  const studioAnnual = await stripePost('/v1/prices', {
    product: studio.id,
    unit_amount: 69000,
    currency: 'eur',
    'recurring[interval]': 'year',
    nickname: 'Studio Annual',
  })
  console.log('✅ Studio annual:', studioAnnual.id)

  // ── Coupon: 50% off for 3 months ──────────────────────────────────────────
  const coupon = await stripePost('/v1/coupons', {
    name: 'Fotonizer Launch — 50% off first 3 months',
    percent_off: 50,
    duration: 'repeating',
    duration_in_months: 3,
  })
  console.log('✅ Coupon:', coupon.id)

  // ── Output env vars ───────────────────────────────────────────────────────
  console.log('\n========== COPY THESE TO .env.local ==========')
  console.log(`STRIPE_PRICE_STARTER_MONTHLY="${starterMonthly.id}"`)
  console.log(`STRIPE_PRICE_STARTER_ANNUAL="${starterAnnual.id}"`)
  console.log(`STRIPE_PRICE_PRO_MONTHLY="${proMonthly.id}"`)
  console.log(`STRIPE_PRICE_PRO_ANNUAL="${proAnnual.id}"`)
  console.log(`STRIPE_PRICE_STUDIO_MONTHLY="${studioMonthly.id}"`)
  console.log(`STRIPE_PRICE_STUDIO_ANNUAL="${studioAnnual.id}"`)
  console.log(`STRIPE_PROMO_COUPON_ID="${coupon.id}"`)
  console.log('==============================================')

  // Return IDs for programmatic use
  return {
    starterMonthly: starterMonthly.id,
    starterAnnual: starterAnnual.id,
    proMonthly: proMonthly.id,
    proAnnual: proAnnual.id,
    studioMonthly: studioMonthly.id,
    studioAnnual: studioAnnual.id,
    coupon: coupon.id,
  }
}

main().catch(err => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
