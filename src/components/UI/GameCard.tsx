/* eslint-disable complexity */
import { ReactComponent as DownIcon } from '../../assets/down-icon.svg'
import { GameStatus } from '../../types'
import { Link } from 'react-router-dom'
import { ReactComponent as PlayIcon } from '../../assets/play-icon.svg'
import { ReactComponent as SettingsIcon } from '../../assets/settings-sharp.svg'
import { ReactComponent as StopIcon } from '../../assets/stop-icon.svg'
import { ReactComponent as StopIconAlt } from '../../assets/stop-icon-alt.svg'
import { getProgress, launch, sendKill, updateGame } from '../../helper'
import { handleInstall } from '../utls'
import { useTranslation } from 'react-i18next'
import ContextProvider from '../../state/ContextProvider'
import NewReleasesIcon from '@material-ui/icons/NewReleases'
import React, { useContext, useEffect, useState } from 'react'

const { ipcRenderer, remote } = window.require('electron')
const {
  dialog: { showMessageBox },
} = remote
interface Card {
  appName: string,
  cover: string,
  coverList: string,
  hasUpdate: boolean,
  isInstalled: boolean,
  logo: string,
  size: string,
  title: string,
  version: string
}

interface InstallProgress {
  bytes: string,
  eta: string,
  percent: string
}

const GameCard = ({
  cover,
  title,
  appName,
  isInstalled,
  logo,
  coverList,
  size,
  hasUpdate,
}: Card) => {
  const [progress, setProgress] = useState({
    bytes: '0/0MB',
    eta: '',
    percent: '0.00%',
  } as InstallProgress)
  const { t } = useTranslation('gamepage')

  const { libraryStatus, layout, handleGameStatus } = useContext(
    ContextProvider
  )

  const grid = layout === 'grid'

  const gameStatus: GameStatus = libraryStatus.filter(
    (game) => game.appName === appName
  )[0]

  const { status } = gameStatus || {}
  const isInstalling = status === 'installing' || status === 'updating'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const isPlaying = status === 'playing'
  const haveStatus = isMoving || isReparing || isInstalling || hasUpdate

  useEffect(() => {
    const progressInterval = setInterval(async () => {
      if (isInstalling) {
        const progress = await ipcRenderer.invoke(
          'requestGameProgress',
          appName
        )
        setProgress(progress)
      }
    }, 1500)
    return () => clearInterval(progressInterval)
  }, [isInstalling, appName])

  const { percent } = progress
  const effectPercent = isInstalling
    ? `${125 - getProgress(progress)}%`
    : '100%'

  function getStatus() {
    if (isInstalling) {
      return percent
    }
    if (isMoving) {
      return t('gamecard.moving', 'Moving')
    }
    if (isReparing) {
      return t('gamecard.repairing', 'Repairing')
    }
    if (hasUpdate) {
      return <NewReleasesIcon />
    }

    return ''
  }

  const renderIcon = () => {
    if (isPlaying) {
      return <StopIconAlt onClick={() => handlePlay()} />
    }
    if (isInstalling) {
      return <StopIcon onClick={() => handlePlay()} />
    }
    if (isInstalled) {
      return <PlayIcon onClick={() => handlePlay()} />
    }
    return <DownIcon onClick={() => handlePlay()} />
  }
  return (
    <>
      <div className={grid ? 'gameCard' : 'gameListItem'}>
        {haveStatus && <span className="progress">{getStatus()}</span>}
        <Link
          to={{
            pathname: `/gameconfig/${appName}`,
          }}
        >
          <span
            style={{
              backgroundImage: `url('${
                grid ? cover : coverList
              }?h=400&resize=1&w=300')`,
              backgroundSize: 'cover',
              filter: isInstalled ? 'none' : `grayscale(${effectPercent})`,
            }}
            className={grid ? 'gameImg' : 'gameImgList'}
          >
            {logo && (
              <img
                alt="logo"
                src={`${logo}?h=400&resize=1&w=300`}
                style={{
                  filter: isInstalled ? 'none' : `grayscale(${effectPercent})`,
                }}
                className="gameLogo"
              />
            )}
          </span>
        </Link>
        {grid ? (
          <div className="gameTitle">
            <span>{title}</span>
            {
              <span
                className="icons"
                style={{
                  flexDirection: 'row',
                  width: isInstalled ? '44%' : 'auto',
                }}
              >
                {renderIcon()}
                {isInstalled && (
                  <Link
                    to={{
                      pathname: `/settings/${appName}/wine`,
                      state: { fromGameCard: true },
                    }}
                  >
                    <SettingsIcon fill={'var(--secondary)'} />
                  </Link>
                )}
              </span>
            }
          </div>
        ) : (
          <>
            {<div className="gameListInfo">{size}</div>}
            <span className="gameTitleList">{title}</span>
            {
              <span className="icons">
                {renderIcon()}
                {isInstalled && (
                  <Link
                    to={{
                      pathname: `/settings/${appName}/wine`,
                      state: { fromGameCard: true },
                    }}
                  >
                    <SettingsIcon fill={'var(--secondary)'} />
                  </Link>
                )}
              </span>
            }
          </>
        )}
      </div>
      {!grid ? <hr style={{ opacity: 0.1, width: '90%' }} /> : ''}
    </>
  )

  async function handlePlay() {
    if (!isInstalled) {
      return await handleInstall({
        appName,
        handleGameStatus,
        installPath: 'another',
        isInstalling,
        t,
      })
    }
    if (status === 'playing' || status === 'updating') {
      handleGameStatus({ appName, status: 'done' })
      return sendKill(appName)
    }

    handleGameStatus({ appName, status: 'playing' })
    await launch(appName).then(async (err: string | string[]) => {
      if (!err) {
        return
      }

      if (
        typeof err === 'string' &&
        err.includes('ERROR: Game is out of date')
      ) {
        const { response } = await showMessageBox({
          buttons: [t('box.yes'), t('box.no')],
          message: t('box.update.message'),
          title: t('box.update.title'),
        })

        if (response === 0) {
          await handleGameStatus({ appName, status: 'done' })
          handleGameStatus({ appName, status: 'updating' })
          await updateGame(appName)
          return handleGameStatus({ appName, status: 'done' })
        }
        handleGameStatus({ appName, status: 'playing' })
        await launch(`${appName} --skip-version-check`)
        return handleGameStatus({ appName, status: 'done' })
      }
    })

    return handleGameStatus({ appName, status: 'done' })
  }
}

export default GameCard
