require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('common'));

// Buat browser instance
let browser;

const launchBrowser = async () => {
  browser = await chromium.launch(); // Browser headless
}

launchBrowser();

app.use('/gen', async (req, res) => {
  const { text, background, color } = req.query;
  
  if (!text) return res.status(200).json({
    status: false,
    code: "required",
    message: "Parameter `text` is required!",
  })
  
  try {
    if (!browser) {
      await launchBrowser();
    }
    
    const context = await browser.newContext({
      viewport: {
        width: 1536,
        height: 695
      }
    });
    const page = await context.newPage();
    
    const filePath = path.join(__dirname, './site/index.html');
    
    // Open https://www.bratgenerator.com/
    await page.goto(`file://${filePath}`);
    
    // Click on <div> #toggleButtonWhite
    await page.click('#toggleButtonWhite');
    
    // Click on <div> #textOverlay
    await page.click('#textOverlay');
    
    // Click on <input> #textInput
    await page.click('#textInput');
    
    // Fill "sas" on <input> #textInput
    await page.fill('#textInput', text);
    
    await page.evaluate((data) => {
      if (data.background) {
        $('.node__content.clearfix').css('background-color', data.background);
      }
      if (data.color) {
        $('.textFitted').css('color', data.color);
      }
    }, { background, color });
    
    const element = await page.$('#textOverlay');
    const box = await element.boundingBox();
    
    res.set('Content-Type', 'image/png');
    res.end(await page.screenshot({
      clip: {
        x: box.x,
        y: box.y,
        width: 500,
       height: 500
      }
    }));

    await context.close();
  } catch(e) {
    res.code(500).send({
      status: false,
      code: "error",
      message: e.message
    })
  } finally {
    // nothing
  }
});

app.get("/", (req, res) => {
  res.send({
    msg: "Hello World"
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Menangani penutupan server
const closeBrowser = async () => {
  if (browser) {
    console.log('Closing browser...');
    await browser.close();
    console.log('Browser closed');
  }
};

process.on('SIGINT', async () => {
  console.log('SIGINT received');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received');
  await closeBrowser();
  process.exit(0);
});

process.on('exit', async () => {
  console.log('Process exiting');
  await closeBrowser();
});
