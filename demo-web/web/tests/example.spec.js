import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://seleniumbase.io/coffee/');
  await expect(page.getByRole('link', { name: 'Cart page' })).toContainText('cart (0)');
  await expect(page.locator('#app')).toContainText('Espresso $10.00');
  await page.locator('[data-test="Espresso"]').click();
  await expect(page.getByRole('link', { name: 'Cart page' })).toContainText('cart (1)');
  await expect(page.locator('[data-test="checkout"]')).toContainText('Total: $10.00');
  await page.locator('[data-test="Americano"]').click();
  await expect(page.getByRole('link', { name: 'Cart page' })).toContainText('cart (2)');
  await page.getByRole('link', { name: 'Cart page' }).click();
  await expect(page.locator('[data-test="checkout"]')).toContainText('Total: $17.00');
  await page.locator('[data-test="checkout"]').click();
  await expect(page.getByRole('heading')).toContainText('Payment details');
  await page.getByRole('textbox', { name: 'Name' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('somkiat');
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('xx@xx.com');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#app')).toContainText('Thanks for your purchase. Please check your email for payment.');
});