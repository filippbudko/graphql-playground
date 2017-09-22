import * as React from 'react'
import { remote, ipcRenderer } from 'electron'
import { Provider } from 'react-redux'
import { Icon, $v } from 'graphcool-styles'
import * as cx from 'classnames'
import Playground from 'graphql-playground/lib/components/Playground'
import ThemeProvider from 'graphql-playground/lib/components/theme/ThemeProvider'
import ToggleButton from 'graphcool-tmp-ui/lib/ToggleButton'
import Tooltip from 'graphcool-tmp-ui/lib/Tooltip'
import {
  GraphQLProjectConfig,
  getGraphQLProjectConfig,
  getGraphQLConfig,
} from 'graphql-config'
import { createNewWindow } from './utils'
import createStore from './createStore'
import InitialView from './InitialView/InitialView'

const store = createStore()

interface State {
  endpoint?: string
  openInitialView: boolean
  openTooltipTheme: boolean
  activeEndpoint?: {
    name: string
    url: string
  }
  theme: string
  projects?: any[]
}

export default class ElectronApp extends React.Component<{}, State> {
  state: State = {
    openInitialView: true,
    openTooltipTheme: false,
    activeEndpoint: null,
    theme: 'dark',
  }
  private playground: Playground

  handleSelectEndpoint = (endpoint: string) => {
    this.setState({ endpoint, openInitialView: false } as State)
  }

  handleSelectFolder = (path: string) => {
    try {
      // Get config from path
      const config = getGraphQLConfig(path)
      let projects = config.getProjects()
      // If no multi projects
      if (!projects) {
        projects = {}
        const project = config.getProjectConfig()
        // Take the folder name as a key
        const pathSplit = path.split('/')
        const folderName = pathSplit[pathSplit.length - 1]
        projects[folderName] = project
      }
      // Get all enpoints for the project
      const projectsState = Object.keys(projects).map(key => {
        const project = projects[key]
        const endpoints = project.endpointsExtension.getRawEndpointsMap()
        const endpointsState = Object.keys(endpoints).map(a => {
          const endpoint: any = endpoints[a]
          endpoint.name = a
          return endpoint
        })
        return {
          name: key,
          endpoints: endpointsState,
        }
      })

      // Select first enpoind found
      const activeEndpoint = projectsState[0].endpoints[0]

      this.setState(
        {
          openInitialView: false,
          activeEndpoint,
          endpoint: activeEndpoint.url,
          projects: projectsState,
        } as State,
      )
    } catch (error) {
      alert(error)
    }
  }

  handleChangeItem = activeEndpoint => {
    const endpoint = activeEndpoint.url
    this.setState({ activeEndpoint, endpoint } as State)
  }

  handleToggleTooltipTheme = e => {
    this.setState({ openTooltipTheme: !this.state.openTooltipTheme } as State)
  }

  handleChangeTheme = () => {
    this.setState(
      { theme: this.state.theme === 'dark' ? 'light' : 'dark' } as State,
    )
  }

  handleOpenNewWindow = () => {
    createNewWindow()
  }

  nextTab = () => {
    if (this.playground) {
      this.playground.nextTab()
    }
  }

  prevTab = () => {
    if (this.playground) {
      this.playground.prevTab()
    }
  }

  componentDidMount() {
    ipcRenderer.on('Tab', this.readMessage)
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('Tab', this.readMessage)
  }

  readMessage = (error, message) => {
    if (message === 'Next') {
      this.nextTab()
    } else {
      this.prevTab()
    }
  }

  render() {
    const {
      theme,
      projects,
      endpoint,
      openInitialView,
      openTooltipTheme,
      activeEndpoint,
    } = this.state

    return (
      <Provider store={store}>
        <div className={cx('root', theme)}>
          <style jsx={true} global={true}>{`
            .app-content .left-content {
              letter-spacing: 0.5px;
            }
            .app-endpoint .tabs .history {
              margin-right: 30px;
            }
          `}</style>
          <style jsx={true}>{`
            .root {
              @p: .flex, .flexColumn, .bgDarkestBlue;
            }
            .root.light {
              background-color: #dbdee0;
            }
            .app-content {
              @p: .flex, .flexRow;
            }
            .app-content .left-content {
              @p: .white, .relative, .mr6, .bgDarkBlue40;
              flex: 0 222px;
              padding-top: 57px;
            }
            .app-content .left-content.light {
              @p: .bgWhite70, .black60;
            }
            .app-content .list {
              @p: .overflowHidden;
              max-width: 222px;
            }
            .left-content .list-item {
              @p: .pv10, .ph25, .fw6, .toe, .overflowHidden, .nowrap;
            }
            .left-content .list-item.list-item-project {
              @p: .pointer, .pl38, .f12;
            }
            .left-content .list-item.list-item-project.active {
              @p: .bgDarkBlue, .bGreen;
              border-left-style: solid;
              border-left-width: 4px;
              padding-left: 34px;
            }
            .left-content.light .list-item.list-item-project.active {
              background-color: #e7e8ea;
            }
            .app-content .playground {
              @p: .flex1;
            }
            .sidenav-footer {
              @p: .absolute, .bottom0, .w100, .flex, .itemsCenter,
                .justifyBetween, .pv20, .bgDarkBlue;
            }
            .light .sidenav-footer {
              background-color: #eeeff0;
            }
            .sidenav-footer .button {
              @p: .br2, .black90, .pointer, .pa10, .fw6, .flex, .itemsCenter,
                .ml20;
            }
          `}</style>
          <InitialView
            isOpen={openInitialView}
            onSelectFolder={this.handleSelectFolder}
            onSelectEndpoint={this.handleSelectEndpoint}
          />
          {endpoint &&
            <div className={cx('app-content', { 'app-endpoint': !projects })}>
              {projects &&
                <div className={cx('left-content', theme)}>
                  <div className="list">
                    {projects.map(project =>
                      <div key={project.name}>
                        <div className={cx('list-item')}>
                          {project.name}
                        </div>
                        {project.endpoints.map(ept =>
                          <div
                            key={ept.name}
                            className={cx('list-item list-item-project', {
                              active: activeEndpoint === ept,
                            })}
                            // tslint:disable-next-line
                            onClick={() => this.handleChangeItem(ept)}
                          >
                            {ept.name}
                          </div>,
                        )}
                      </div>,
                    )}
                  </div>
                  <div className="sidenav-footer">
                    <button
                      className="button"
                      onClick={this.handleOpenNewWindow}
                    >
                      <Icon
                        src={require('graphcool-styles/icons/stroke/add.svg')}
                        stroke={true}
                        color={$v.gray90}
                        width={14}
                        height={14}
                        strokeWidth={6}
                      />
                      NEW WINDOW
                    </button>
                  </div>
                </div>}
              <div className="playground">
                <Playground
                  ref={playground => (this.playground = playground)}
                  endpoint={endpoint}
                  wsApiPrefix={'wss://subscriptions.graph.cool/v1'}
                  isApp={true}
                />
              </div>
            </div>}
        </div>
      </Provider>
    )
  }
}
