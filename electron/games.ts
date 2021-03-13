/* eslint-disable @typescript-eslint/ban-ts-comment */
import { exec } from 'child_process'
import { dialog } from 'electron'
import {
  existsSync,
  writeFile
} from 'graceful-fs'
import i18next from 'i18next'
import { promisify } from 'util'

import { getSettings } from './config'
import {
  heroicFolder,
  heroicGamesConfigPath,
  home,
  legendaryBin
} from './constants'
import { installDxvk } from './dxvk'
import { errorHandler } from './utils'

const execAsync = promisify(exec)

const { showErrorBox } = dialog

const checkGameUpdates = async (): Promise<Array<string>> => {
  const command = `${legendaryBin} list-installed --check-updates --tsv | grep True | awk '{print $1}'`
  const { stdout } = await execAsync(command)
  const result = stdout.split('\n')
  return result
}

const launchGame = async (appName: string) => {
  let envVars = ''
  let gameMode: string

  const {
    winePrefix,
    wineVersion,
    otherOptions,
    useGameMode,
    showFps,
    launcherArgs = '',
    showMangohud,
    audioFix,
    autoInstallDxvk,
  } = await getSettings(appName)

  const fixedWinePrefix = winePrefix.replace('~', home)
  let wineCommand = `--wine ${wineVersion.bin}`

  // We need to keep replacing the ' to keep compatibility with old configs
  let prefix = `--wine-prefix '${fixedWinePrefix.replaceAll("'", '')}'`

  const isProton =
    wineVersion.name.startsWith('Proton') ||
    wineVersion.name.startsWith('Steam')
  prefix = isProton ? '' : prefix

  const options = {
    other: otherOptions ? otherOptions : '',
    fps: showFps ? `DXVK_HUD=fps` : '',
    audio: audioFix ? `PULSE_LATENCY_MSEC=60` : '',
    showMangohud: showMangohud ? `MANGOHUD=1` : '',
    proton: isProton
      ? `STEAM_COMPAT_DATA_PATH='${winePrefix
          .replaceAll("'", '')
          .replace('~', home)}'`
      : '',
  }

  envVars = Object.values(options).join(' ')
  if (isProton) {
    console.log(
      `\n You are using Proton, this can lead to some bugs, 
            please do not open issues with bugs related with games`,
      wineVersion.name
    )
  }

  // Proton doesn't create a prefix folder so this is a workaround
  if (isProton && !existsSync(fixedWinePrefix)) {
    const command = `mkdir '${fixedWinePrefix}' -p`
    await execAsync(command)
  }

  // Install DXVK for non Proton Prefixes
  if (!isProton && autoInstallDxvk) {
    await installDxvk(winePrefix)
  }

  if (wineVersion.name !== 'Wine Default') {
    const { bin } = wineVersion
    wineCommand = isProton
      ? `--no-wine --wrapper "${bin} run"`
      : `--wine ${bin}`
  }

  // check if Gamemode is installed
  await execAsync(`which gamemoderun`)
    .then(({ stdout }) => (gameMode = stdout.split('\n')[0]))
    .catch(() => console.log('GameMode not installed'))

  const runWithGameMode = useGameMode && gameMode ? gameMode : ''

  const command = `${envVars} ${runWithGameMode} ${legendaryBin} launch ${appName}  ${wineCommand} ${prefix} ${launcherArgs}`
  console.log('\n Launch Command:', command)

  return execAsync(command)
    .then(({ stderr }) => {
      writeFile(
        `${heroicGamesConfigPath}${appName}-lastPlay.log`,
        stderr,
        () => 'done'
      )
      if (stderr.includes('Errno')) {
        showErrorBox(
          i18next.t('box.error', 'Something Went Wrong'),
          i18next.t(
            'box.error.launch',
            'Error when launching the game, check the logs!'
          )
        )
      }
    })
    .catch(async ({ stderr }) => {
      writeFile(
        `${heroicGamesConfigPath}${appName}-lastPlay.log`,
        stderr,
        () => 'done'
      )
      return stderr
    })
}

const updateGame = async (game: string) => {
  const logPath = `${heroicGamesConfigPath}${game}.log`
  const command = `${legendaryBin} update ${game} -y &> ${logPath}`

  try {
    await execAsync(command, { shell: '/bin/bash' })
  } catch (error) {
    return errorHandler(logPath)
  }
}

export {
  checkGameUpdates,
  heroicFolder,
  heroicGamesConfigPath,
  home,
  launchGame,
  legendaryBin,
  updateGame
}
