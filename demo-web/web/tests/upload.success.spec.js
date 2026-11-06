import { test, expect } from '@playwright/test';

const path = require('node:path');
const receiptPath = path.resolve(__dirname, '../../test-data/receipt-1.png');

test('uploads a receipt image and displays the extracted shop and total', async ({ page }) => {
  await page.route('**/api/extract', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: { shop_name: 'Test Shop', total_amount: 100 }
    })
  }));

  await page.goto('/upload');

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('test_id_dropzone').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(receiptPath);

  const filePreview = page.getByTestId('test_id_filePreview');
  await expect(filePreview).toBeVisible();
  await expect(filePreview).toContainText('receipt-1.png');
  await expect(filePreview.locator('img')).toHaveJSProperty('naturalWidth', 1);

  const extractionRequest = page.waitForRequest((request) =>
    request.url().endsWith('/api/extract') && request.method() === 'POST'
  );
  await page.getByTestId('test_id_uploadButton').click();
  await extractionRequest;

  await expect(page.getByTestId('test_id_extractedShopName')).toHaveText('Test Shop');
  await expect(page.getByTestId('test_id_extractedTotalAmount')).toHaveText('฿100.00');
});