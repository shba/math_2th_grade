import { expect, test, type Page } from '@playwright/test'

/**
 * Exercise, lesson, level-test, placement and game screens must fit one phone screen: nothing
 * scrolls, and every control is inside the viewport (run at 360×640, 390×844 and 412×915).
 */

const TOPICS = ['add-sub-20', 'numbers-1000', 'add-sub-100', 'word-problems', 'mult-div', 'line-fractions', 'data', 'measurement', 'geometry']
const GAMES = ['feed', 'castle', 'race', 'target']

async function expectFits(page: Page, what: string) {
  await page.waitForTimeout(500)
  const r = await page.evaluate(() => {
    const screen = document.querySelector('.screen')
    const outside = [...document.querySelectorAll('button, canvas, input, .equation, .instruction, .speech-bubble')]
      .filter((el) => {
        const b = el.getBoundingClientRect()
        if (!b.width || !b.height || el.closest('.sheet-body')) return false
        return b.bottom > innerHeight + 1 || b.top < -1 || b.left < -1 || b.right > innerWidth + 1
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}: ${(el.textContent ?? '').trim().slice(0, 30)}`)
    return {
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight,
      fit: !!screen?.classList.contains('fit'),
      clipped: screen ? screen.scrollHeight - screen.clientHeight : 0,
      outside,
    }
  })
  expect(r.fit, `${what}: one-viewport layout`).toBe(true)
  expect(r.scrollHeight, `${what}: page scrolls`).toBeLessThanOrEqual(r.innerHeight)
  expect(r.clipped, `${what}: content cut off`).toBeLessThanOrEqual(1)
  expect(r.outside, `${what}: controls outside the screen`).toEqual([])
}

test.beforeEach(async ({ page }) => {
  await page.goto('./#/new')
  await page.locator('.pick-card').first().click()
  await page.locator('input').fill('נועה')
  await page.locator('.name-form button[type=submit]').click()
  await page.locator('.pick-card').first().click()
  await page.locator('.btn.primary.huge').click()
  await page.waitForURL(/#\/placement/)
})

test('placement', async ({ page }) => {
  await expectFits(page, 'placement intro')
  await page.locator('.btn.primary.huge').click()
  await expectFits(page, 'placement exercise')
})

test('lessons', async ({ page }) => {
  for (const topic of TOPICS) {
    await page.goto(`./#/lesson/${topic}`)
    for (let slide = 1; slide < 20; slide++) {
      await expectFits(page, `lesson ${topic} slide ${slide}`)
      const ask = page.locator('.lesson-ask .choice')
      if (await ask.count()) {
        await ask.first().click()
        await expectFits(page, `lesson ${topic} slide ${slide} answered`)
      }
      const next = page.getByRole('button', { name: /הַלְאָה/ })
      if (!(await next.count())) break
      await next.click()
    }
  }
})

test('practice: every topic, both inputs, hint and solution sheets', async ({ page }) => {
  for (const topic of TOPICS) {
    await page.goto(`./#/practice/${topic}`)
    await page.locator('.exercise').waitFor()
    await expectFits(page, `practice ${topic}`)
    const toggle = page.locator('.ex-bar .tool').first()
    if (await page.locator('.hand-pad').count()) {
      await toggle.click()
      await expect(page.locator('.keypad')).toBeVisible()
      await expect(page.locator('.hand-pad')).toHaveCount(0)
      await expectFits(page, `practice ${topic} keypad`)
    }
    const add = page.getByRole('button', { name: 'הוספת ספרה' })
    if (await add.count()) {
      await add.click()
      await expectFits(page, `practice ${topic} extra digit box`)
    }
    await page.locator('.dont-know').click()
    await expect(page.locator('.sheet')).toBeVisible()
    await expectFits(page, `practice ${topic} hint`)
    await page.locator('.sheet .btn.ghost').click()
    await expectFits(page, `practice ${topic} solution`)
    await page.locator('.sheet .btn.primary').click()
    await page.locator('.exercise').waitFor()
    await expectFits(page, `practice ${topic} next exercise`)
  }
})

test('level test', async ({ page }) => {
  await page.goto('./#/test/add-sub-20')
  await expectFits(page, 'level test intro')
  await page.locator('.btn.accent.huge').click()
  await expectFits(page, 'level test exercise')
})

test('games', async ({ page }) => {
  for (const game of GAMES) {
    await page.goto(`./#/games/${game}`)
    await expectFits(page, `game ${game}`)
    const start = page.locator('.race-intro .btn.primary')
    if (await start.count()) {
      await start.click()
      await expectFits(page, `game ${game} playing`)
    }
  }
})
