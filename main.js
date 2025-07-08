/*
 * @Description:
 * @Author: FBZ
 * @Date: 2025-07-07 15:32:43
 * @LastEditors: FBZ
 * @LastEditTime: 2025-07-08 17:00:47
 */
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { exec } = require('child_process')
const fs = require('fs')

let win
let alwaysOnTop = true

let config = {
  intranetAdapter: '以太网',
  internetAdapter: 'WLAN',
}

function loadExternalConfig() {
  const configPath = path.join(path.dirname(app.getPath('exe')), 'config.json')
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (parsed.intranetAdapter && parsed.internetAdapter) {
        config = parsed
      }
    } catch (e) {
      console.warn('读取 config.json 失败，使用默认配置', e)
    }
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 280,
    height: 160,
    useContentSize: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
  })

  win.loadFile('renderer/index.html')
  // win.webContents.openDevTools({ mode: 'detach' })
}

app.whenReady().then(() => {
  loadExternalConfig()
  createWindow()
})

const getAdapterStatus = (name) =>
  new Promise((resolve) => {
    exec(
      `powershell -Command "(Get-NetAdapter -Name \\"${name}\\" -ErrorAction SilentlyContinue).Status"`,
      (err, stdout) => {
        const status = stdout.trim()
        resolve(status === 'Up' ? 'Up' : 'Down')
      }
    )
  })
const isAdapterUp = async (name) => (await getAdapterStatus(name)) === 'Up'

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// 网卡状态检查
ipcMain.handle('get-status', async () => {
  const [intraStatus, interStatus] = await Promise.all([
    getAdapterStatus(config.intranetAdapter),
    getAdapterStatus(config.internetAdapter),
  ])

  if (intraStatus === 'Up' && interStatus === 'Up') {
    exec(
      `netsh interface set interface "${config.intranetAdapter}" admin=DISABLED`
    )
  }

  return {
    intranet: intraStatus,
    internet: interStatus,
  }
})

// 切换模式（netsh 实现）
ipcMain.handle('toggle-mode', async () => {
  const run = (cmd) =>
    new Promise((resolve, reject) =>
      exec(cmd, (err, stdout, stderr) =>
        err ? reject(stderr || err) : resolve(stdout)
      )
    )

  const intraUp = await isAdapterUp(config.intranetAdapter)
  const interUp = await isAdapterUp(config.internetAdapter)

  if (intraUp && !interUp) {
    await run(
      `netsh interface set interface name="${config.intranetAdapter}" admin=DISABLED`
    )
    await run(
      `netsh interface set interface name="${config.internetAdapter}" admin=ENABLED`
    )
    return '切换至纯外网'
  }
  if (interUp && !intraUp) {
    await run(
      `netsh interface set interface name="${config.internetAdapter}" admin=DISABLED`
    )
    await run(
      `netsh interface set interface name="${config.intranetAdapter}" admin=ENABLED`
    )
    return '切换至纯内网'
  }
  if (interUp && intraUp) {
    await run(
      `netsh interface set interface name="${config.intranetAdapter}" admin=DISABLED`
    )
    return '内外网共用中，切换至纯外网'
  }
  return '状态异常，未切换'
})

// 切换置顶
ipcMain.handle('toggle-always-on-top', () => {
  alwaysOnTop = !alwaysOnTop
  win.setAlwaysOnTop(alwaysOnTop)
  return alwaysOnTop
})
