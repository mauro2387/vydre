import puppeteer from 'puppeteer-core'

async function getChromePath(): Promise<string> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH
  }

  const paths = [
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    // Mac
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ]

  const fs = await import('fs')
  for (const p of paths) {
    try {
      if (fs.existsSync(/* turbopackIgnore: true */ p)) return p
    } catch {
      continue
    }
  }

  throw new Error(
    'Chrome no encontrado. Instalá Google Chrome o configurá ' +
    'PUPPETEER_EXECUTABLE_PATH en .env.local'
  )
}

async function getBrowser() {
  if (process.env.NODE_ENV === 'production') {
    const chromium = await import('@sparticuz/chromium')
    return puppeteer.launch({
      args: chromium.default.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.default.executablePath(),
      headless: true,
    })
  }

  const executablePath = await getChromePath()
  return puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath,
    headless: true,
  })
}

export async function generatePDF(html: string): Promise<Buffer> {
  const browser = await getBrowser()

  try {
    const page = await browser.newPage()

    await page.setContent(html, {
      waitUntil: 'networkidle0',
    })

    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
      },
      printBackground: true,
      preferCSSPageSize: false,
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
