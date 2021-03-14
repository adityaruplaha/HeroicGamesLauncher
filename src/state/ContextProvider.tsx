import { ContextType } from '../types'
import React from 'react'

const initialContext: ContextType = {
  user: '',
  data: [],
  libraryStatus: [],
  refreshing: false,
  filter: 'all',
  layout: 'grid',
  error: false,
  gameUpdates: [],
  refresh: () => Promise.resolve(),
  refreshLibrary: () => Promise.resolve(),
  handleGameStatus: () => Promise.resolve(),
  handleSearch: () => null,
  handleFilter: () => null,
  handleLayout: () => null,
}

export default React.createContext(initialContext)
