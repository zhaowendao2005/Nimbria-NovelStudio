import { app } from 'electron'

import { AppManager } from './app-manager'

const appManager = new AppManager()

void app.whenReady().then(() => appManager.boot())

app.on('before-quit', () => {
  void appManager.shutdown()
})

