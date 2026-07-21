import type { Run, Store, TestCase, TestStatus } from "./types";

const testCases: TestCase[] = [
  {
    id: "checkout-toast",
    name: "checkout shows success toast",
    filePath: "tests/e2e/checkout.spec.ts",
    category: "timing",
    owner: "@web-platform",
    sourceSnippet: `test('checkout shows success toast', async ({ page }) => {
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.waitForTimeout(500);
  await expect(page.getByText('Order confirmed')).toBeVisible();
});`,
  },
  {
    id: "admin-fixture",
    name: "member cannot access admin settings",
    filePath: "tests/auth/permissions.spec.ts",
    category: "shared-state",
    owner: "@identity",
    sourceSnippet: `const user = sharedFixtures.member;

test('member cannot access admin settings', async () => {
  const response = await api.get('/admin/settings', { user });
  expect(response.status).toBe(403);
});

test('admin can update settings', async () => {
  user.role = 'admin';
  await api.put('/admin/settings', { user, theme: 'dark' });
});`,
  },
  {
    id: "tax-service",
    name: "calculates tax for California address",
    filePath: "tests/integration/tax.spec.ts",
    category: "network",
    owner: "@commerce",
    sourceSnippet: `test('calculates tax for California address', async () => {
  const response = await fetch('https://sandbox.taxjar.com/v2/taxes', {
    method: 'POST',
    headers: { Authorization: \`Bearer \${process.env.TAXJAR_KEY}\` },
    body: JSON.stringify(californiaOrder),
  });
  expect(response.status).toBe(200);
  expect((await response.json()).tax.amount_to_collect).toBe(8.25);
});`,
  },
  {
    id: "parallel-port",
    name: "starts webhook receiver on test port",
    filePath: "tests/integration/webhooks.spec.ts",
    category: "resource",
    owner: "@integrations",
    sourceSnippet: `test('starts webhook receiver on test port', async () => {
  const server = createWebhookServer();
  await server.listen(4100);
  await sendTestWebhook('http://localhost:4100/hook');
  expect(server.received).toHaveLength(1);
  await server.close();
});`,
  },
  {
    id: "currency-format",
    name: "formats USD with two decimal places",
    filePath: "tests/unit/currency.test.ts",
    category: "stable",
    owner: "@commerce",
    sourceSnippet: `test('formats USD with two decimal places', () => {
  expect(formatCurrency(42, 'USD')).toBe('$42.00');
});`,
  },
  {
    id: "slugify",
    name: "slugifies unicode product names",
    filePath: "tests/unit/slugify.test.ts",
    category: "stable",
    owner: "@catalog",
    sourceSnippet: `test('slugifies unicode product names', () => {
  expect(slugify('Crème Brûlée Set')).toBe('creme-brulee-set');
});`,
  },
  {
    id: "cart-total",
    name: "recalculates cart total after removal",
    filePath: "tests/unit/cart.test.ts",
    category: "stable",
    owner: "@commerce",
    sourceSnippet: `test('recalculates cart total after removal', () => {
  const cart = createCart([{ price: 12 }, { price: 8 }]);
  cart.remove(0);
  expect(cart.total).toBe(8);
});`,
  },
  {
    id: "session-expiry",
    name: "expires session after idle timeout",
    filePath: "tests/auth/session.test.ts",
    category: "timing",
    owner: "@identity",
    sourceSnippet: `test('expires session after idle timeout', async () => {
  const session = await createSession();
  jest.advanceTimersByTime(30 * 60 * 1000);
  await new Promise(resolve => setTimeout(resolve, 10));
  expect(await sessionStore.get(session.id)).toBeNull();
});`,
  },
  {
    id: "invoice-pdf",
    name: "renders invoice line items",
    filePath: "tests/integration/invoice.test.ts",
    category: "stable",
    owner: "@billing",
    sourceSnippet: `test('renders invoice line items', async () => {
  const pdf = await renderInvoice(fixtureInvoice);
  expect(await extractText(pdf)).toContain('Pro plan — $29.00');
});`,
  },
];

const commits = ["a91cf02", "c04bd11", "e72a98b", "f38d2ca", "19ac6ee", "7b15e4a"];

const errors: Record<string, string> = {
  timing: `TimeoutError: expect(locator).toBeVisible()\nLocator: getByText('Order confirmed')\nExpected: visible\nReceived: hidden\nTimeout: 500ms\n  at tests/e2e/checkout.spec.ts:4:56`,
  "shared-state": `AssertionError: expected 200 to equal 403\n  at tests/auth/permissions.spec.ts:5:27\nMetadata: previous test = "admin can update settings"`,
  network: `FetchError: request to https://sandbox.taxjar.com/v2/taxes failed\nreason: read ECONNRESET\n  at tests/integration/tax.spec.ts:2:20`,
  resource: `Error: listen EADDRINUSE: address already in use :::4100\n  at Server.setupListenHandle (node:net:1811:16)`,
};

function seededNoise(a: number, b: number, c: number) {
  return ((a + 3) * 17 + (b + 5) * 31 + c * 13) % 100;
}

function outcome(test: TestCase, commitIndex: number, runIndex: number): TestStatus {
  const n = seededNoise(testCases.indexOf(test), commitIndex, runIndex);
  if (test.category === "stable") return test.id === "invoice-pdf" && commitIndex === 1 ? "fail" : "pass";
  if (test.id === "checkout-toast") return n < (commitIndex > 3 ? 16 : 36) ? "fail" : "pass";
  if (test.id === "admin-fixture") return runIndex === 1 && commitIndex !== 4 ? "fail" : "pass";
  if (test.id === "tax-service") return n < 25 ? "fail" : "pass";
  if (test.id === "parallel-port") return runIndex > 0 && commitIndex % 2 === 0 ? "fail" : "pass";
  if (test.id === "session-expiry") return n < 14 ? "fail" : "pass";
  return "pass";
}

function generateRuns(): Run[] {
  const runs: Run[] = [];
  testCases.forEach((test, testIndex) => {
    commits.forEach((commitSha, commitIndex) => {
      for (let runIndex = 0; runIndex < 3; runIndex += 1) {
        const status = outcome(test, commitIndex, runIndex);
        const baseDuration = test.category === "stable" ? 80 + testIndex * 22 : 580 + testIndex * 120;
        const durationMs = baseDuration + seededNoise(testIndex, commitIndex, runIndex) * 19 + (status === "fail" ? 640 : 0);
        runs.push({
          id: `${test.id}-${commitIndex}-${runIndex}`,
          testCaseId: test.id,
          commitSha,
          timestamp: new Date(Date.UTC(2026, 6, 7 + commitIndex, 9 + runIndex * 3, testIndex * 2)).toISOString(),
          status,
          durationMs,
          errorOutput: status === "fail" ? errors[test.category] ?? `Snapshot mismatch at ${test.filePath}:8:3` : null,
          ranInParallel: test.category === "resource" || (commitIndex + runIndex) % 3 !== 0,
          orderIndex: test.category === "shared-state" && status === "fail" ? 18 : 3 + ((testIndex * 7 + runIndex * 3) % 19),
          previousTest: test.category === "shared-state" && status === "fail" ? "admin can update settings" : undefined,
        });
      }
    });
  });
  return runs;
}

export function createSeedStore(): Store {
  return { testCases, runs: generateRuns(), diagnoses: [] };
}
