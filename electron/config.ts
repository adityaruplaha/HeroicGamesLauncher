/* eslint-disable @typescript-eslint/ban-ts-comment */
import { exec } from 'child_process'
import {
  existsSync,
  mkdir,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'graceful-fs'
import { userInfo as user } from 'os'
import { promisify } from 'util'

import {
  heroicConfigPath,
  heroicGamesConfigPath,
  heroicInstallPath,
  heroicToolsPath,
  home,
  userInfo
} from './constants'
import {
  AppSettings,
  UserInfo,
  WineProps
} from './types'

const execAsync = promisify(exec)

// check other wine versions installed
async function getAlternativeWine(): Promise<WineProps[]> {
  // Just add a new string here in case another path is found on another distro
  const steamPaths: string[] = [
    `${home}/.local/share/Steam`,
    `${home}/.var/app/com.valvesoftware.Steam/.local/share/Steam`,
    '/usr/share/steam',
  ]

  if (!existsSync(`${heroicToolsPath}/wine`)) {
    exec(`mkdir '${heroicToolsPath}/wine' -p`, () => {
      return 'done'
    })
  }

  if (!existsSync(`${heroicToolsPath}/proton`)) {
    exec(`mkdir '${heroicToolsPath}/proton' -p`, () => {
      return 'done'
    })
  }

  const protonPaths: string[] = [`${heroicToolsPath}/proton/`]
  const foundPaths = steamPaths.filter((path) => existsSync(path))

  const defaultWine = { name: '', bin: '' }
  await execAsync(`which wine`)
    .then(async ({ stdout }) => {
      defaultWine.bin = stdout.split('\n')[0]
      const { stdout: out } = await execAsync(`wine --version`)
      defaultWine.name = `Wine - ${out.split('\n')[0]}`
    })
    .catch(() => console.log('Wine not installed'))

  foundPaths.forEach((path) => {
    protonPaths.push(`${path}/steamapps/common/`)
    protonPaths.push(`${path}/compatibilitytools.d/`)
    return
  })

  const lutrisPath = `${home}/.local/share/lutris`
  const lutrisCompatPath = `${lutrisPath}/runners/wine/`
  const proton: Set<{ name: string; bin: string }> = new Set()
  const altWine: Set<{ name: string; bin: string }> = new Set()

  protonPaths.forEach((path) => {
    if (existsSync(path)) {
      readdirSync(path).forEach((version) => {
        if (version.toLowerCase().startsWith('proton')) {
          proton.add({
            name: `Proton - ${version}`,
            bin: `'${path}${version}/proton'`,
          })
        }
      })
    }
  })

  if (existsSync(lutrisCompatPath)) {
    readdirSync(lutrisCompatPath).forEach((version) => {
      altWine.add({
        name: `Wine - ${version}`,
        bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
      })
    })
  }

  readdirSync(`${heroicToolsPath}/wine/`).forEach((version) => {
    altWine.add({
      name: `Wine - ${version}`,
      bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
    })
  })

  return [defaultWine, ...altWine, ...proton]
}

const isLoggedIn = () => existsSync(userInfo)

const getSettings = async (
  appName: string | 'default'
): Promise<AppSettings> => {
  const gameConfig = `${heroicGamesConfigPath}${appName}.json`

  const globalConfig = heroicConfigPath
  let settingsPath = gameConfig
  let settingsName = appName

  if (appName === 'default' || !existsSync(gameConfig)) {
    settingsPath = globalConfig
    settingsName = 'defaultSettings'
    if (!existsSync(settingsPath)) {
      await writeDefaultConfig()
      return getSettings('default')
    }
  }

  const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
  return settings[settingsName]
}

export const getUserInfo = (): UserInfo => {
  if (existsSync(userInfo)) {
    return JSON.parse(readFileSync(userInfo, 'utf-8'))
  }
  return { account_id: '', displayName: null }
}

const writeDefaultConfig = async () => {
  if (!existsSync(heroicConfigPath)) {
    const { account_id } = getUserInfo()
    const userName = user().username
    const [defaultWine] = await getAlternativeWine()

    const config = {
      defaultSettings: {
        defaultInstallPath: heroicInstallPath,
        wineVersion: defaultWine,
        winePrefix: `${home}/.wine`,
        otherOptions: '',
        useGameMode: false,
        showFps: false,
        maxWorkers: 0,
        language: 'en',
        userInfo: {
          name: userName,
          epicId: account_id,
        },
      },
    }

    writeFileSync(heroicConfigPath, JSON.stringify(config, null, 2))
  }

  if (!existsSync(heroicGamesConfigPath)) {
    mkdir(heroicGamesConfigPath, () => {
      return 'done'
    })
  }
}

const writeGameConfig = async (game: string) => {
  if (!existsSync(`${heroicGamesConfigPath}${game}.json`)) {
    const {
      wineVersion,
      winePrefix,
      otherOptions,
      useGameMode,
      showFps,
      userInfo,
    } = await getSettings('default')

    const config = {
      [game]: {
        wineVersion,
        winePrefix,
        otherOptions,
        useGameMode,
        showFps,
        userInfo,
      },
    }

    writeFileSync(
      `${heroicGamesConfigPath}${game}.json`,
      JSON.stringify(config, null, 2),
      null
    )
  }
}

export {
  getAlternativeWine,
  getSettings,
  isLoggedIn,
  writeDefaultConfig,
  writeGameConfig
}
