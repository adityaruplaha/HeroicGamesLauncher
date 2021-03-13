import * as axios from 'axios'
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { exec } from 'child_process'
import {
  app,
  dialog
} from 'electron'
import { existsSync } from 'graceful-fs'
import i18next from 'i18next'
import { promisify } from 'util'

import {
  heroicGamesConfigPath,
  icon
} from './constants'

const execAsync = promisify(exec)

const { showErrorBox, showMessageBox } = dialog

async function checkForUpdates() {
  const {
    data: { tag_name },
  } = await axios.default.get(
    'https://api.github.com/repos/flavioislima/HeroicGamesLauncher/releases/latest'
  )

  const newVersion = tag_name.replace('v', '').replaceAll('.', '')
  const currentVersion = app.getVersion().replaceAll('.', '')

  return newVersion > currentVersion
}

const showAboutWindow = () => {
  app.setAboutPanelOptions({
    applicationName: 'Heroic Games Launcher',
    copyright: 'GPL V3',
    applicationVersion: `${app.getVersion()} Magelan`,
    website: 'https://github.com/flavioislima/HeroicGamesLauncher',
    iconPath: icon,
  })
  return app.showAboutPanel()
}

const handleExit = async () => {
  const isLocked = existsSync(`${heroicGamesConfigPath}/lock`)

  if (isLocked) {
    const { response } = await showMessageBox({
      title: i18next.t('box.quit.title', 'Exit'),
      message: i18next.t(
        'box.quit.message',
        'There are pending operations, are you sure?'
      ),
      buttons: [i18next.t('box.no'), i18next.t('box.yes')],
    })

    if (response === 0) {
      return
    }
    return app.exit()
  }
  app.exit()
}

async function errorHandler(logPath: string): Promise<void> {
  const noSpaceMsg = 'Not enough available disk space'
  return execAsync(`tail ${logPath} | grep 'disk space'`)
    .then(({ stdout }) => {
      if (stdout.includes(noSpaceMsg)) {
        console.log(noSpaceMsg)
        return showErrorBox(
          i18next.t('box.error.diskspace.title', 'No Space'),
          i18next.t(
            'box.error.diskspace.message',
            'Not enough available disk space'
          )
        )
      }
      return genericErrorMessage()
    })
    .catch(() => console.log('operation interrupted'))
}

function genericErrorMessage(): void {
  return showErrorBox(
    i18next.t('box.error.generic.title', 'Unknown Error'),
    i18next.t('box.error.generic.message', 'An Unknown Error has occurred')
  )
}

export {
  checkForUpdates,
  errorHandler,
  genericErrorMessage,
  handleExit,
  showAboutWindow
}
