import { test, expect } from "@playwright/test";

test.describe("PhishIntel Spec #03: Load Into Analyzer From Scan History", () => {
  const SCAN_1 = {
    id: "PG-2608",
    ts: Date.now() - 1000 * 60 * 30, // 30 mins ago (older)
    src: "user",
    T: 0.05,
    P: 0.375,
    localP: 0.375,
    engine: "local",
    modelVersion: "PAHF-Net",
    decision: "PHISHING",
    risk: "High",
    riskScore: 38,
    indicators: [
      {
        id: "IND-PAHF-1",
        title: "Suspicious Call-To-Action",
        description: "Urgent recruitment link detected in body",
        severity: "high",
        category: "text",
        score_impact: 18,
      },
    ],
    email: {
      subject: "AI is moving beyond demos. Are you ready to become an FDE?",
      from: "hello@scaler.com",
      replyTo: "no-reply@scaler.com",
      body: "Join our exclusive Forward Deployed Engineer program. Register now at https://scaler.com/fde-apply to secure your spot.",
      headers: "From: hello@scaler.com\nTo: analyst@phishintel.internal\nSubject: AI is moving beyond demos. Are you ready to become an FDE?",
    },
    fromReg: "scaler.com",
    fromDom: "scaler.com",
    urls: ["https://scaler.com/fde-apply"],
    modalities: {
      text: { modality: "text", code: "g_t", dimension: 256, available: true, gateWeight: 0.85, contribution: 0.22, description: "Text" },
      url: { modality: "url", code: "g_u", dimension: 32, available: true, gateWeight: 0.8, contribution: 0.1, description: "URL" },
      structure: { modality: "structure", code: "g_s", dimension: 32, available: true, gateWeight: 0.7, contribution: 0.03, description: "Structure" },
      linguistic: { modality: "linguistic", code: "g_l", dimension: 32, available: true, gateWeight: 0.75, contribution: 0.025, description: "Linguistic" },
    },
    gateWeights: { text: 0.85, url: 0.8, structure: 0.7, linguistic: 0.75 },
    availabilityMask: { text: true, url: true, structure: true, linguistic: true },
    modalityContributions: { text: 0.22, url: 0.1, structure: 0.03, linguistic: 0.025 },
    fusedScore: 0.375,
    entities: { sector: "Technology", amounts: [], tx: "", cards: [], accts: [], orgs: ["Scaler"] },
  };

  const SCAN_2 = {
    id: "PG-2950",
    ts: Date.now() - 1000 * 60 * 5, // 5 mins ago (newer)
    src: "user",
    T: 0.5,
    P: 0.164,
    localP: 0.164,
    engine: "local",
    modelVersion: "PAHF-Net",
    decision: "SAFE",
    risk: "Low",
    riskScore: 16,
    indicators: [],
    email: {
      subject: "Your Devin login code - 476247",
      from: "auth@devin.ai",
      replyTo: "support@devin.ai",
      body: "Your one-time login verification code is 476247. Do not share this code with anyone.",
      headers: "From: auth@devin.ai\nTo: analyst@phishintel.internal\nSubject: Your Devin login code - 476247",
    },
    fromReg: "devin.ai",
    fromDom: "devin.ai",
    urls: ["https://devin.ai/login"],
    modalities: {
      text: { modality: "text", code: "g_t", dimension: 256, available: true, gateWeight: 0.85, contribution: -0.1, description: "Text" },
      url: { modality: "url", code: "g_u", dimension: 32, available: true, gateWeight: 0.8, contribution: -0.05, description: "URL" },
      structure: { modality: "structure", code: "g_s", dimension: 32, available: true, gateWeight: 0.7, contribution: -0.01, description: "Structure" },
      linguistic: { modality: "linguistic", code: "g_l", dimension: 32, available: true, gateWeight: 0.75, contribution: -0.004, description: "Linguistic" },
    },
    gateWeights: { text: 0.85, url: 0.8, structure: 0.7, linguistic: 0.75 },
    availabilityMask: { text: true, url: true, structure: true, linguistic: true },
    modalityContributions: { text: -0.1, url: -0.05, structure: -0.01, linguistic: -0.004 },
    fusedScore: 0.164,
    entities: { sector: "Software", amounts: [], tx: "", cards: [], accts: [], orgs: ["Devin"] },
  };

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/history");
    await page.evaluate((scans) => {
      window.localStorage.setItem("pg.scans", JSON.stringify(scans));
      window.localStorage.setItem("pg.settings", JSON.stringify({ useService: false, jump: false, T: 0.5 }));
    }, [SCAN_2, SCAN_1]); // newer first
    await page.reload();
  });

  test("L1/L3: Click ⋮ menu item 'Load into analyzer' on older scan fills analyzer form & stored verdict", async ({ page }) => {
    // 1. Locate older scan row (PG-2608)
    const olderRow = page.locator("tr", { hasText: "PG-2608" });
    await expect(olderRow).toBeVisible();

    // 2. Open action menu
    const menuBtn = olderRow.locator("button.row-act-btn");
    await menuBtn.click();

    // 3. Click 'Load into analyzer'
    const loadMenuItem = page.locator("button[role='menuitem']", { hasText: "Load into analyzer" });
    await expect(loadMenuItem).toBeVisible();
    await loadMenuItem.click();

    // 4. Assert navigation to /analyzer with query cleaned up
    await page.waitForURL("http://localhost:3000/analyzer");
    expect(page.url()).toBe("http://localhost:3000/analyzer");

    // 5. Verify fields populated from PG-2608
    const subjectInput = page.locator("#f-subject");
    const fromInput = page.locator("#f-from");
    const replyInput = page.locator("#f-reply");
    const bodyInput = page.locator("#f-body");

    await expect(subjectInput).toHaveValue(SCAN_1.email.subject);
    await expect(fromInput).toHaveValue(SCAN_1.email.from);
    await expect(replyInput).toHaveValue(SCAN_1.email.replyTo);
    await expect(bodyInput).toHaveValue(SCAN_1.email.body);

    // Verify raw headers textarea is populated
    const headersTextarea = page.locator("#f-headers");
    await expect(headersTextarea).toHaveValue(SCAN_1.email.headers);

    // Verify URLs
    const detectedChip = page.locator(".url-chips .tag", { hasText: "scaler.com/fde-apply" });
    await expect(detectedChip).toBeVisible();

    // Verify newer scan (PG-2950 / Devin) is NOT shown
    await expect(subjectInput).not.toHaveValue(SCAN_2.email.subject);

    // 6. Verify result panel renders stored verdict and badge
    const badge = page.locator(".badge-loaded-scan");
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("Loaded from scan PG-2608 · stored result");

    const decisionText = page.locator(".dec");
    await expect(decisionText).toHaveText("Phishing");

    // 7. Verify page refresh leaves analyzer clean without re-loading old query param
    await page.reload();
    await expect(page.url()).toBe("http://localhost:3000/analyzer");
    const emptyNotice = page.locator(".load-notice");
    await expect(emptyNotice).toHaveCount(0);
  });

  test("L1/L3: Click expanded row button 'Load into analyzer' on newer scan loads second scan", async ({ page }) => {
    // 1. Locate newer scan row (PG-2950)
    const newerRow = page.locator("tr", { hasText: "PG-2950" });
    await expect(newerRow).toBeVisible();

    // 2. Expand row by clicking it
    await newerRow.click();

    // 3. Click 'Load into analyzer' button inside expanded panel
    const loadBtn = page.locator("button.btn.btn-line.btn-sm", { hasText: "Load into analyzer" });
    await expect(loadBtn).toBeVisible();
    await loadBtn.click();

    // 4. Assert navigation to /analyzer
    await page.waitForURL("http://localhost:3000/analyzer");
    expect(page.url()).toBe("http://localhost:3000/analyzer");

    // 5. Verify fields populated from PG-2950
    const subjectInput = page.locator("#f-subject");
    const fromInput = page.locator("#f-from");
    const bodyInput = page.locator("#f-body");

    await expect(subjectInput).toHaveValue(SCAN_2.email.subject);
    await expect(fromInput).toHaveValue(SCAN_2.email.from);
    await expect(bodyInput).toHaveValue(SCAN_2.email.body);

    // 6. Verify result panel renders stored verdict and badge for PG-2950
    const badge = page.locator(".badge-loaded-scan");
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("Loaded from scan PG-2950 · stored result");

    const decisionText = page.locator(".dec");
    await expect(decisionText).toHaveText("Safe · legitimate");
  });

  test("L1/L3: Analyzing loaded email creates a new scan without overwriting original", async ({ page }) => {
    await page.goto("http://localhost:3000/analyzer?load=PG-2608");
    await page.waitForURL("http://localhost:3000/analyzer");

    // Verify badge is visible initially
    const badge = page.locator(".badge-loaded-scan");
    await expect(badge).toBeVisible();
    await expect(badge).toContainText("Loaded from scan PG-2608 · stored result");

    // Trigger analysis
    const analyzeBtn = page.locator("button.btn.btn-accent", { hasText: "Analyse" });
    await analyzeBtn.click();

    // Wait for analysis to complete
    await expect(page.locator(".res-top")).toBeVisible();

    // Verify loaded badge is removed since this is a fresh analysis
    await expect(page.locator(".badge-loaded-scan")).toHaveCount(0);

    // Verify original scan in localStorage was NOT overwritten
    const scansInStorage = await page.evaluate(() => {
      return JSON.parse(window.localStorage.getItem("pg.scans") || "[]");
    });
    const originalScan = scansInStorage.find((s: any) => s.id === "PG-2608");
    expect(originalScan).toBeDefined();
    expect(originalScan.id).toBe("PG-2608");
  });

  test("L1/L3: Non-existent scan ID displays 'That scan is no longer available' without crash", async ({ page }) => {
    await page.goto("http://localhost:3000/analyzer?load=PG-DOES-NOT-EXIST-999");
    await page.waitForURL("http://localhost:3000/analyzer");

    const notice = page.locator(".load-notice");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("That scan is no longer available");

    // Verify form remains clean and "Awaiting a message" is shown
    const emptyState = page.locator(".empty h4");
    await expect(emptyState).toHaveText("Awaiting a message");
  });

  test("L2/L3: Scan without saved body displays 'Original message wasn't saved for this scan.' notice", async ({ page }) => {
    // Seed a legacy scan with no body
    const LEGACY_SCAN = {
      ...SCAN_1,
      id: "PG-LEGACY-EMPTY",
      email: {
        subject: "Subject only scan",
        from: "legacy@test.org",
        replyTo: "",
        body: "",
        headers: "",
      },
    };

    await page.evaluate((scan) => {
      const existing = JSON.parse(window.localStorage.getItem("pg.scans") || "[]");
      window.localStorage.setItem("pg.scans", JSON.stringify([scan, ...existing]));
    }, LEGACY_SCAN);

    await page.goto("http://localhost:3000/analyzer?load=PG-LEGACY-EMPTY");
    await page.waitForURL("http://localhost:3000/analyzer");

    const notice = page.locator(".load-notice");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("Original message wasn't saved for this scan.");

    // Subject is still populated
    await expect(page.locator("#f-subject")).toHaveValue("Subject only scan");
  });
});
