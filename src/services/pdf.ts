import puppeteer, { Browser } from "puppeteer";

let browserInstance: Browser | null = null;
let activeJobs = 0;
const MAX_CONCURRENT_JOBS = Number(process.env.PDF_MAX_CONCURRENCY || 2);
const jobQueue: Array<() => void> = [];

async function getBrowser(): Promise<Browser> {
  if (browserInstance) return browserInstance;
  // Launch a single shared headless browser
  browserInstance = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  return browserInstance;
}

export type PdfJobOptions = {
  type: "invoice" | "report";
  id?: string;
  html?: string;
  printUrlBase?: string; // e.g. http://localhost:3000
  timeoutMs?: number;
  filenameHint?: string;
};

export async function generatePdfBuffer(
  options: PdfJobOptions
): Promise<Uint8Array> {
  // Simple concurrency gate
  await new Promise<void>((resolve) => {
    const tryStart = () => {
      if (activeJobs < MAX_CONCURRENT_JOBS) {
        activeJobs += 1;
        resolve();
      } else {
        jobQueue.push(tryStart);
      }
    };
    tryStart();
  });

  const {
    type,
    id,
    html,
    printUrlBase = process.env.PRINT_BASE_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:5173",
    timeoutMs = 60000,
  } = options;

  const browser = await getBrowser();
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(timeoutMs);
  page.setDefaultTimeout(timeoutMs);

  // Stabilize rendering
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );
  page.on("console", (msg) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text: any = (msg as any).text ? (msg as any).text() : msg.type();
      console.log(`[PDF console:${msg.type()}] ${text}`);
    } catch {
      // ignore
    }
  });
  page.on("pageerror", (err) => console.error("[PDF pageerror]", err));
  page.on("requestfailed", (req) =>
    console.warn("[PDF requestfailed]", req.url(), req.failure()?.errorText)
  );

  try {
    if (html) {
      // Render provided HTML content
      await page.setContent(html, { waitUntil: "domcontentloaded" });
    } else {
      // Render internal print route
      let path = "";
      if (type === "invoice") {
        if (!id) throw new Error("Missing invoice id");
        path = `/print/invoice/${encodeURIComponent(id)}?print=1`;
      } else if (type === "report") {
        if (!id) throw new Error("Missing report id");
        path = `/print/report/${encodeURIComponent(id)}?print=1`;
      } else {
        throw new Error("Unsupported PDF type");
      }
      const url = `${printUrlBase}${path}`;
      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });
        await Promise.race([
          page.waitForSelector(".print-container", {
            timeout: Math.floor(timeoutMs / 2),
          }),
          page.waitForSelector("#root", { timeout: Math.floor(timeoutMs / 2) }),
        ]);
        // tiny settle delay
        await new Promise((r) => setTimeout(r, 300));
      } catch (navErr) {
        console.error(`[PDF] Failed to load print URL ${url}:`, navErr);
        const fallback = `<!doctype html><html><head>
<meta charset="utf-8" />
<style>
body { font-family: Arial, sans-serif; padding: 24px; }
h1 { margin: 0 0 8px; }
.meta { color: #555; font-size: 12px; margin-bottom: 16px; }
</style>
</head><body>
<h1>${type === "report" ? "Report" : "Invoice"} ${id ?? ""}</h1>
<div class="meta">${new Date().toLocaleString()}</div>
<p>Could not load the print page at ${url}. This is a fallback PDF.</p>
</body></html>`;
        await page.setContent(fallback, { waitUntil: "domcontentloaded" });
      }
    }

    // Use screen media to honor our CSS while printing
    try {
      await page.emulateMediaType("screen");
    } catch {}

    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "12mm",
        right: "12mm",
        bottom: "12mm",
        left: "12mm",
      },
    });
    return buffer;
  } finally {
    await page.close().catch(() => undefined);
    activeJobs = Math.max(0, activeJobs - 1);
    const next = jobQueue.shift();
    if (next) next();
  }
}

export async function closePdfBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close().catch(() => undefined);
    browserInstance = null;
  }
}
