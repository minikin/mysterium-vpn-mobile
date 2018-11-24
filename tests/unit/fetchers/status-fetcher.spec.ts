import { TequilapiClient } from 'mysterium-tequilapi'
import ConnectionStore from '../../../src/app/stores/connection-store'
import { ConnectionStatusEnum } from '../../../src/libraries/tequil-api/enums'
import TequilApiState from '../../../src/libraries/tequil-api/tequil-api-state'
import { CONFIG } from './../../../src/config'
import { StatusFetcher } from './../../../src/fetchers/status-fetcher'
import { TequilapiClientMock } from './../mocks/tequilapi-mock'

describe('StatusFetcher', () => {
  const tequilApiState = new TequilApiState()
  const refreshInterval = CONFIG.REFRESH_INTERVALS.CONNECTION
  let api: TequilapiClient
  let connectionStore: ConnectionStore
  let fetcher: StatusFetcher

  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  beforeEach(() => {
    tequilApiState.identityId = 'MOCKED_IDENTITY_ID'
    api = new TequilapiClientMock()
    connectionStore = new ConnectionStore(api, tequilApiState)
    fetcher = new StatusFetcher(api.connectionStatus, tequilApiState, connectionStore)
  })

  describe('.start', () => {
    it('fetches and updates connection status', () => {
      fetcher.start(refreshInterval)

      expect(fetcher.isStarted).toBe(true)
      expect(api.connectionStatus).toHaveBeenCalledTimes(1)

      jest.runAllTicks()
      expect(connectionStore.connection.status).toEqual('NotConnected')
    })

    it('fetches status continuously', () => {
      fetcher.start(refreshInterval)

      for (let call = 1; call < 6; call++) {
        expect(api.connectionStatus).toHaveBeenCalledTimes(call)

        jest.runAllTicks()
        expect(fetcher.isRunning).toBe(false)

        jest.advanceTimersByTime(refreshInterval)
      }
    })

    it('does not fetch status when invoking the second time', () => {
      fetcher.start(refreshInterval)
      jest.runAllTicks()
      expect(api.connectionStatus).toHaveBeenCalledTimes(1)

      fetcher.start(refreshInterval)
      jest.runAllTicks()
      expect(api.connectionStatus).toHaveBeenCalledTimes(1)
    })
  })

  describe('.stop', () => {
    it('stops fetching when invoked after starting', () => {
      fetcher.start(refreshInterval)
      jest.runAllTicks()

      expect(api.connectionStatus).toHaveBeenCalledTimes(1)
      jest.runTimersToTime(refreshInterval)
      expect(api.connectionStatus).toHaveBeenCalledTimes(2)

      fetcher.stop()
      expect(fetcher.isStarted).toBe(false)

      jest.runTimersToTime(refreshInterval)
      expect(api.connectionStatus).toHaveBeenCalledTimes(2)
      jest.runTimersToTime(refreshInterval)
      expect(api.connectionStatus).toHaveBeenCalledTimes(2)
    })

    it('does nothing when invoked without starting', () => {
      fetcher.stop()
    })
  })

  describe('.refresh', () => {

    it('fetches status immediately', async () => {
      fetcher.start(refreshInterval)
      jest.runAllTicks()

      expect(fetcher.isRunning).toBe(false)
      connectionStore.updateConnectionStatus(ConnectionStatusEnum.CONNECTED)

      await fetcher.refresh()
      expect(connectionStore.connection.status).toEqual('NotConnected')
    })
  })
})
