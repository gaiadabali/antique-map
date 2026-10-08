// Diagnostic: type a pin into the checkout's latitude/longitude fields key by key and read what the
// form will send (the hidden lat/lng fields), plus whether any form is nested in another.
/* global process, console, document */
import { chromium } from '@playwright/test'

const [origin] = process.argv.slice(2)
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()
await page.goto(`${origin}/shop`)
const href = await page.locator('main a[href^="/product/"]').first().getAttribute('href')
await page.goto(`${origin}${href}`)
await page.getByRole('button', { name: 'Add to bag' }).click()
await page.getByText('Added to your bag.').waitFor()
await page.goto(`${origin}/checkout`)
const fields = page.locator('input[inputmode="decimal"]')
await fields.nth(0).focus()
await page.keyboard.type('-8.6705')
await page.keyboard.press('Tab')
await page.keyboard.type('115.2126')
console.log(
  JSON.stringify(
    await page.evaluate(() => ({
      hidden: [...document.querySelectorAll('input[type="hidden"]')].map(
        (el) => `${el.name}=${el.value}`,
      ),
      nestedForms: document.querySelectorAll('form form').length,
      forms: document.querySelectorAll('form').length,
    })),
    null,
    1,
  ),
)
await browser.close()
