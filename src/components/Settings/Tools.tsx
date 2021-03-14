import { WineProps } from '../../types'
import { useTranslation } from 'react-i18next'
import React from 'react'

const { ipcRenderer, remote } = window.require('electron')
const {
  dialog: { showOpenDialog },
} = remote

interface Props {
  winePrefix: string,
  wineVersion: WineProps
}

export default function Tools({ wineVersion, winePrefix }: Props) {
  const { t } = useTranslation()

  const callTools = (tool: string, exe?: string) =>
    ipcRenderer.send('callTool', {
      exe,
      prefix: winePrefix,
      tool,
      wine: wineVersion.bin,
    })

  const handleRunExe = async () => {
    let exe = ''
    const { filePaths } = await showOpenDialog({
      buttonLabel: t('box.select'),
      filters: ['exe', 'msi'],
      properties: ['openFile'],
      title: t('box.runexe.title'),
    })
    if (filePaths[0]) {
      exe = filePaths[0]
      return callTools('runExe', exe)
    }
    return
  }

  function dropHandler(ev: React.DragEvent<HTMLSpanElement>) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault()

    if (ev.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s)
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[0].kind === 'file') {
        const exe = ev?.dataTransfer?.items[0]?.getAsFile()?.path

        return callTools('runExe', exe)
      }
    }
    return
  }

  function dragOverHandler(ev: React.DragEvent<HTMLSpanElement>) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault()
  }

  return (
    <>
      <div className="settingsTools">
        <div className="toolsWrapper">
          <span className="tools" onClick={() => callTools('winecfg')}>
            Winecfg
          </span>
          <span className="tools" onClick={() => callTools('winetricks')}>
            Winetricks
          </span>
          <span
            draggable
            onDrop={(ev) => dropHandler(ev)}
            onDragOver={(ev) => dragOverHandler(ev)}
            className="tools drag"
            onClick={() => handleRunExe()}
          >
            {t('setting.runexe.title')}
            <br />
            <span>{t('setting.runexe.message')}</span>
          </span>
        </div>
      </div>
    </>
  )
}
