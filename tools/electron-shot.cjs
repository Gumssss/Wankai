// Electron side of tools/character-shot.mjs and tools/make-icon.mjs: opens
// SHOT_URL in a hidden window, waits for window.__sheetReady and saves the page
// (or the PNG data URL the page put in window.__sheetPng) to SHOT_OUT.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');

// A hidden window must keep rendering.
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1480, height: 860, show: false, webPreferences: { backgroundThrottling: false } });
  window.webContents.setAudioMuted(true);
  window.webContents.on('console-message', event => {
    if (/error|warn/i.test(event.level ?? '') || /Uncaught|Error/.test(event.message ?? '')) console.error('[page]', event.message);
  });
  let code = 0;
  try {
    await window.loadURL(process.env.SHOT_URL);
    const started = Date.now();
    while (!(await window.webContents.executeJavaScript('window.__sheetReady === true'))) {
      if (Date.now() - started > 60000) throw new Error('the sheet did not finish within 60 s');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    const png = await window.webContents.executeJavaScript('window.__sheetPng ?? null');
    if (png) {
      fs.writeFileSync(process.env.SHOT_OUT, Buffer.from(png.slice(png.indexOf(',') + 1), 'base64'));
      app.exit(0);
      return;
    }
    const size = await window.webContents.executeJavaScript('[document.body.scrollWidth, document.body.scrollHeight]');
    window.setContentSize(size[0], size[1]);
    await new Promise(resolve => setTimeout(resolve, 300));
    fs.writeFileSync(process.env.SHOT_OUT, (await window.webContents.capturePage()).toPNG());
  } catch (error) {
    console.error(error.message);
    code = 1;
  }
  app.exit(code);
});
