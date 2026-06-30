// Render HTML → PDF con Chromium headless (Vercel Node Functions).
// Usa @sparticuz/chromium (binario serverless) + puppeteer-core. NO LibreOffice.
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function renderPDF(html, { format = "Letter" } = {}) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    defaultViewport: chromium.defaultViewport,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    return await page.pdf({
      format,
      printBackground: true,
      preferCSSPageSize: true,      // respeta @page Letter / margin:0 del template
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  } finally {
    await browser.close();
  }
}
