import { expect, test, type Page } from '@playwright/test';

async function startGame(page: Page) {
  await page.goto('/');
  await page.getByLabel('Spiel starten').click();
}

async function boardAll(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    const guest = page.getByLabel('Gast einsteigen lassen').first();
    await expect(guest).toBeEnabled({ timeout: 10_000 });
    await guest.dispatchEvent('pointerdown');
    await page.waitForTimeout(450);
  }
}

test('ein ganzer Flug: ankommen, einsteigen, nachzählen, abheben', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await startGame(page);
  await expect(page.getByLabel('Flugzeug mit 3 Plätzen')).toBeVisible();
  await expect(page.getByLabel('Gast einsteigen lassen')).toHaveCount(3);
  await page.screenshot({ path: info.outputPath('1-gate.png') });

  await boardAll(page, 3);
  await expect(page.getByLabel('Gast einsteigen lassen')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('2-alle-drin.png') });

  // Nach Nachzählen und Start kommt das nächste, größere Flugzeug.
  await expect(page.getByLabel('Flugzeug mit 4 Plätzen')).toBeVisible({ timeout: 40_000 });
  expect(errors).toEqual([]);
});

async function openParents(page: Page) {
  await page.getByLabel('Eltern-Bereich').dispatchEvent('pointerdown');
  const task = await page.locator('.task').innerText();
  const [a, b] = task.match(/\d+/g)!.map(Number);
  for (const d of String(a + b)) await page.getByRole('button', { name: d, exact: true }).click();
}

test('Jumbo mit 9 Gästen: nur die vorderen drei sind antippbar', async ({ page }, info) => {
  await startGame(page);
  await openParents(page);
  for (let i = 0; i < 6; i++) await page.getByLabel('Mehr Gäste in Flug 1').click();
  await page.getByRole('button', { name: 'Speichern und Spiel neu starten' }).click();
  await page.getByLabel('Spiel starten').click();
  await expect(page.getByLabel('Flugzeug mit 9 Plätzen')).toBeVisible();
  await expect(page.getByLabel('Gast einsteigen lassen')).toHaveCount(3);
  await boardAll(page, 5);
  await page.screenshot({ path: info.outputPath('jumbo.png') });
  await expect(page.getByLabel('Gast einsteigen lassen')).toHaveCount(3);
});

test('Eltern-Bereich ist durch eine Rechenaufgabe gesperrt', async ({ page }) => {
  await startGame(page);
  await page.getByLabel('Eltern-Bereich').dispatchEvent('pointerdown');
  const task = await page.locator('.task').innerText();
  const [a, b] = task.match(/\d+/g)!.map(Number);

  // Falsche Antwort: bleibt gesperrt
  const wrong = String((a + b + 1) % 100).padStart(2, '0');
  for (const d of wrong) await page.getByRole('button', { name: d, exact: true }).click();
  await expect(page.getByText('Flüge pro Runde')).toHaveCount(0);

  await page.waitForTimeout(800);
  const task2 = await page.locator('.task').innerText();
  const [c, d2] = task2.match(/\d+/g)!.map(Number);
  for (const d of String(c + d2)) await page.getByRole('button', { name: d, exact: true }).click();
  await expect(page.getByText('Flüge pro Runde')).toBeVisible();
});

test('Einstellungen ändern die Gästezahl', async ({ page }) => {
  await startGame(page);
  await page.getByLabel('Eltern-Bereich').dispatchEvent('pointerdown');
  const task = await page.locator('.task').innerText();
  const [a, b] = task.match(/\d+/g)!.map(Number);
  for (const d of String(a + b)) await page.getByRole('button', { name: d, exact: true }).click();

  await page.getByLabel('Weniger Gäste in Flug 1').click();
  await page.getByLabel('Weniger Gäste in Flug 1').click();
  await page.getByRole('button', { name: 'Speichern und Spiel neu starten' }).click();
  await page.getByLabel('Spiel starten').click();
  await expect(page.getByLabel('Flugzeug mit 1 Plätzen')).toBeVisible();
});
