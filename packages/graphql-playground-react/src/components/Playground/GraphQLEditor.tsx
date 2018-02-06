import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { parse, print, GraphQLSchema, isNamedType } from 'graphql'
import * as cn from 'classnames'
import ExecuteButton from './ExecuteButton'
import { QueryEditor } from './QueryEditor'
import CodeMirrorSizer from 'graphiql/dist/utility/CodeMirrorSizer'
import getSelectedOperationName from 'graphiql/dist/utility/getSelectedOperationName'
import debounce from 'graphiql/dist/utility/debounce'
import { fillLeafs } from 'graphiql/dist/utility/fillLeafs'
import { getLeft, getTop } from 'graphiql/dist/utility/elementPosition'
import {
  OperationDefinition,
  Session,
  ApolloLinkExecuteResponse,
} from '../../types'
import { Response } from '../Playground'
import { connect } from 'react-redux'

import { defaultQuery } from '../../constants'
import Spinner from '../Spinner'
import Results from './Results'
import ReponseTracing from './ResponseTracing'
import withTheme from '../Theme/withTheme'
import { LocalThemeInterface } from '../Theme'
import GraphDocs from './DocExplorer/GraphDocs'
import { SchemaFetcher } from './SchemaFetcher'
import { setStacks } from '../../actions/graphiql-docs'
import { getRootMap, getNewStack } from './util/stack'
import { getSessionDocs } from '../../selectors/sessionDocs'
import { styled } from '../../styled/index'
import TopBar from './TopBar/TopBar'
import { SharingProps } from '../Share'
import getQueryFacts from './util/getQueryFacts'
import { VariableEditor } from './VariableEditor'
import { GraphQLRequest, FetchResult } from 'apollo-link'

/**
 * The top-level React component for GraphQLEditor, intended to encompass the entire
 * browser viewport.
 */

export interface Props {
  fetcher: (graphQLRequest: GraphQLRequest) => ApolloLinkExecuteResponse
  schemaFetcher: SchemaFetcher
  isGraphcoolUrl?: boolean
  query?: string
  variables?: string
  operationName?: string
  responses?: Response[]
  isActive: boolean
  session: Session

  storage?: any
  defaultQuery?: string
  onEditQuery?: (data: any) => void
  onEditVariables?: (variables: any) => any
  onEditOperationName?: (name: any) => any
  onToggleDocs?: (value: boolean) => any
  onClickCodeGeneration?: any
  onChangeHeaders?: (headers: string) => any
  onClickHistory?: () => void
  onChangeEndpoint?: (value: string) => void
  onClickShare?: () => void
  onStopQuery: () => void
  onRef: any
  showCodeGeneration?: boolean
  showEndpoints?: boolean
  showQueryTitle?: boolean
  showResponseTitle?: boolean
  showDownloadJsonButton?: boolean
  disableQueryHeader?: boolean
  queryOnly?: boolean
  showDocs?: boolean
  rerenderQuery?: boolean
  operations?: OperationDefinition[]
  showSchema?: boolean
  schemaIdl?: string
  schemaModelName?: string
  disableAutofocus?: boolean
  disableResize?: boolean
  fixedEndpoint?: boolean
  shouldHideTracingResponse: boolean

  disableAnimation?: boolean
  hideLineNumbers?: boolean
  hideGutters?: boolean
  readonly?: boolean
  useVim?: boolean
  endpoint: string

  // sharing
  sharing?: SharingProps
}

export interface ReduxProps {
  setStacks: (sessionId: string, stack: any[]) => void
  navStack: any[]
}

export interface State {
  editorFlex: number
  variableEditorOpen: boolean
  variableEditorHeight: number
  responseTracingOpen: boolean
  responseTracingHeight: number
  docExplorerWidth: number
  subscription: any
  variableToType: any
  operations: any[]
  schemaExplorerOpen: boolean
  schemaExplorerWidth: number
  isWaitingForResponse: boolean
  selectedVariableNames: string[]
  responseExtensions: any
  nextQueryStartTime?: Date
  tracingSupported?: boolean
  queryVariablesActive: boolean
  endpointUnreachable: boolean
  isReloadingSchema: boolean
  schema?: GraphQLSchema | null
  query: string
  variables: string
  operationName?: string
  responses: any[]
  currentQueryStartTime?: Date
  currentQueryEndTime?: Date
}

export interface SimpleProps {
  children?: any
}

export interface ToolbarButtonProps extends SimpleProps {
  onClick: (e: any) => void
  title: string
  label: string
}

export class GraphQLEditor extends React.PureComponent<
  Props & LocalThemeInterface & ReduxProps,
  State
> {
  public codeMirrorSizer
  public queryEditorComponent
  public variableEditorComponent
  public resultComponent
  public editorBarComponent
  public docExplorerComponent: any // later React.Component<...>

  private storage: any
  private editorQueryID: number
  private resultID: number = 0
  private queryResizer: any
  private responseResizer: any
  private queryVariablesRef
  private httpHeadersRef

  private updateQueryFacts = debounce(150, query => {
    const queryFacts = getQueryFacts(this.state.schema, query)
    if (queryFacts) {
      // Update operation name should any query names change.
      const operationName = getSelectedOperationName(
        this.state.operations,
        this.state.operationName,
        queryFacts.operations,
      )

      // Report changing of operationName if it changed.
      const onEditOperationName = this.props.onEditOperationName
      if (onEditOperationName && operationName !== this.state.operationName) {
        onEditOperationName(operationName)
      }

      this.setState({
        operationName,
        ...queryFacts,
      })
    }
  })

  constructor(props: Props & LocalThemeInterface & ReduxProps) {
    super(props)

    // Cache the storage instance
    this.storage =
      props.storage || typeof window !== 'undefined'
        ? window.localStorage
        : {
            setItem: () => null,
            removeItem: () => null,
            getItem: () => null,
          }

    // Determine the initial query to display.
    const query =
      props.query !== undefined
        ? props.query
        : this.storageGet('query') !== null
          ? this.storageGet('query')
          : props.defaultQuery !== undefined ? props.defaultQuery : defaultQuery

    // Get the initial query facts.
    const queryFacts = getQueryFacts(null, query)

    // Determine the initial variables to display.
    const variables =
      props.variables !== undefined
        ? props.variables
        : this.storageGet('variables')

    // Determine the initial operationName to use.
    const operationName =
      props.operationName !== undefined
        ? props.operationName
        : getSelectedOperationName(
            null,
            this.storageGet('operationName'),
            queryFacts && queryFacts.operations,
          )

    let queryVariablesActive = this.storageGet('queryVariablesActive')
    queryVariablesActive =
      queryVariablesActive === 'true'
        ? true
        : queryVariablesActive === 'false' ? false : true

    // Initialize state
    this.state = {
      query,
      variables,
      operationName,
      responses: props.responses || [],
      editorFlex: Number(this.storageGet('editorFlex')) || 1,
      variableEditorOpen: queryVariablesActive
        ? Boolean(variables)
        : props.session.headers && props.session.headers.length > 0,
      variableEditorHeight:
        Number(this.storageGet('variableEditorHeight')) || 200,
      responseTracingOpen: false,
      responseTracingHeight:
        Number(this.storageGet('responseTracingHeight')) || 300,
      docExplorerWidth: Number(this.storageGet('docExplorerWidth')) || 350,
      schemaExplorerOpen: false,
      schemaExplorerWidth:
        Number(this.storageGet('schemaExplorerWidth')) || 350,
      isWaitingForResponse: false,
      subscription: null,
      selectedVariableNames: [],
      queryVariablesActive,
      endpointUnreachable: false,
      isReloadingSchema: false,
      ...queryFacts,
    }

    // Ensure only the last executed editor query is rendered.
    this.editorQueryID = 0

    // Subscribe to the browser window closing, treating it as an unmount.
    if (typeof window === 'object') {
      window.addEventListener('beforeunload', () => this.componentWillUnmount())
    }
  }

  componentDidMount() {
    // Ensure a form of a schema exists (including `null`) and
    // if not, fetch one using an introspection query.
    this.ensureOfSchema()

    // Utility for keeping CodeMirror correctly sized.
    this.codeMirrorSizer = new CodeMirrorSizer()
    ;(global as any).g = this
  }

  componentWillReceiveProps(nextProps) {
    let nextSchema = this.state.schema
    let nextQuery = this.state.query
    let nextVariables = this.state.variables
    let nextOperationName = this.state.operationName
    let nextResponses = this.state.responses

    if (nextProps.schema !== undefined) {
      nextSchema = nextProps.schema
    }
    if (
      nextProps.query !== undefined &&
      (this.props.rerenderQuery || nextProps.rerenderQuery)
    ) {
      nextQuery = nextProps.query
    }
    if (nextProps.variables !== undefined) {
      nextVariables = nextProps.variables
    }
    if (nextProps.operationName !== undefined) {
      nextOperationName = nextProps.operationName
    }
    if (nextProps.responses !== undefined) {
      nextResponses = nextProps.responses
    }
    if (
      nextSchema !== this.state.schema ||
      nextQuery !== this.state.query ||
      nextOperationName !== this.state.operationName
    ) {
      this.updateQueryFacts(nextQuery)
    }

    this.setState({
      schema: nextSchema,
      query: nextQuery,
      variables: nextVariables,
      operationName: nextOperationName,
      responses: nextResponses,
    } as State)
  }

  componentDidUpdate() {
    // If this update caused DOM nodes to have changed sizes, update the
    // corresponding CodeMirror instance sizes to match.
    const components = [
      this.queryEditorComponent,
      this.variableEditorComponent,
      // this.resultComponent,
    ]
    this.codeMirrorSizer.updateSizes(components)
    if (this.resultComponent && Boolean(this.state.subscription)) {
      this.resultComponent.scrollTop = this.resultComponent.scrollHeight
    }
  }

  // When the component is about to unmount, store any persistable state, such
  // that when the component is remounted, it will use the last used values.
  componentWillUnmount() {
    this.storageSet('query', this.state.query)
    this.storageSet('variables', this.state.variables)
    this.storageSet('operationName', this.state.operationName)
    this.storageSet('editorFlex', this.state.editorFlex)
    this.storageSet('variableEditorHeight', this.state.variableEditorHeight)
  }

  getHeaderCount() {
    try {
      const headers = JSON.parse(this.props.session.headers!)
      return `(${Object.keys(headers).length})`
    } catch (e) {
      //
    }

    return ''
  }

  tokenInvalid() {
    if (this.state.responses.length === 1) {
      const response = this.state.responses[0].date
      if (response) {
        try {
          const data = JSON.parse(response)
          if (data && data.errors && data.errors[0].code === 3015) {
            return true
          }
        } catch (e) {
          //
        }
      }
    }
    return false
  }

  render() {
    return (
      <div
        className={cn('graphiql-container', { isActive: this.props.isActive })}
      >
        <style jsx={true}>{`
          .graphiql-container {
            font-family: Open Sans, sans-serif;
          }

          .docs-button,
          .schema-button {
            @p: .absolute, .white, .bgGreen, .pa6, .br2, .z2, .ttu, .fw6, .f14,
              .ph10, .pointer;
            padding-bottom: 8px;
            transform: rotate(-90deg);
            left: -44px;
            top: 195px;
          }

          div.schema-button {
            @p: .bgLightOrange;
            left: -53px;
            top: 120px;
          }

          .queryWrap {
            @p: .relative;
            border-top: 8px solid $darkBlue;
          }
          .queryWrap.light {
            border-top: 8px solid #eeeff0;
          }

          .graphiql-button {
            @p: .white50, .bgDarkBlue, .ttu, .f14, .fw6, .br2, .pointer;
            padding: 5px 9px 6px 9px;
            letter-spacing: 0.53px;
          }
          .graphiql-button.prettify {
            @p: .absolute;
            top: -57px;
            right: 38px;
            z-index: 2;
          }
          .intro {
            @p: .absolute, .tlCenter, .top50, .left50, .white20, .f16, .tc;
            font-family: 'Source Code Pro', 'Consolas', 'Inconsolata',
              'Droid Sans Mono', 'Monaco', monospace;
            letter-spacing: 0.6px;
            width: 235px;
          }

          .listening {
            @p: .f16, .white40, .absolute, .bottom0, .bgDarkBlue;
            font-family: 'Source Code Pro', 'Consolas', 'Inconsolata',
              'Droid Sans Mono', 'Monaco', monospace;
            letter-spacing: 0.6px;
            padding-left: 24px;
            padding-bottom: 60px;
          }

          .onboarding-hint {
            @p: .absolute, .br2, .z999;
          }
          .onboarding-hint.step1 {
            top: 207px;
            left: 90px;
          }
          .onboarding-hint.step2 {
            top: 207px;
            left: 90px;
          }
        `}</style>
        <style jsx={true} global={true}>{`
          .query-header-enter {
            opacity: 0.01;
          }

          .query-header-enter.query-header-enter-active {
            opacity: 1;
            transition: opacity 500ms ease-in;
          }

          .query-header-leave {
            opacity: 1;
          }

          .query-header-leave.query-header-leave-active {
            opacity: 0.01;
            transition: opacity 300ms ease-in;
          }
        `}</style>
        <div className="editorWrap">
          <TopBar
            endpoint={this.props.session.endpoint || this.props.endpoint}
            endpointDisabled={false}
            onChangeEndpoint={this.props.onChangeEndpoint}
            onClickHistory={this.props.onClickHistory}
            curl={this.getCurl()}
            onClickPrettify={this.handlePrettifyQuery}
            onClickShare={this.props.onClickShare}
            sharing={this.props.sharing}
            onReloadSchema={this.reloadSchema}
            isReloadingSchema={this.state.isReloadingSchema}
            fixedEndpoint={this.props.fixedEndpoint}
            endpointUnreachable={this.state.endpointUnreachable}
          />
          <div
            ref={this.setEditorBarComponent}
            className="editorBar"
            onMouseDown={this.handleResizeStart}
          >
            <div
              className={cn('queryWrap', this.props.localTheme)}
              style={{
                WebkitFlex: this.state.editorFlex,
                flex: this.state.editorFlex,
              }}
            >
              <QueryEditor
                ref={this.setQueryEditorComponent}
                schema={this.state.schema}
                value={this.state.query}
                onEdit={this.handleEditQuery}
                onHintInformationRender={this.handleHintInformationRender}
                onRunQuery={this.runQueryAtCursor}
                disableAutofocus={this.props.disableAutofocus}
                hideLineNumbers={this.props.hideLineNumbers}
                hideGutters={this.props.hideGutters}
                readOnly={this.props.readonly}
                useVim={this.props.useVim}
                onClickReference={this.handleClickReference}
              />
              <div
                className="variable-editor"
                style={{
                  height: this.state.variableEditorOpen
                    ? this.state.variableEditorHeight
                    : null,
                }}
              >
                <div
                  className="variable-editor-title"
                  style={{
                    cursor: this.state.variableEditorOpen
                      ? 'row-resize'
                      : 'n-resize',
                  }}
                  onMouseDown={this.handleVariableResizeStart}
                >
                  <span
                    className={cn('subtitle', {
                      active: this.state.queryVariablesActive,
                    })}
                    ref={this.setQueryVariablesRef}
                    onClick={this.selectQueryVariables}
                  >
                    {'Query Variables'}
                  </span>
                  <span
                    className={cn('subtitle', {
                      active: !this.state.queryVariablesActive,
                    })}
                    ref={this.setHttpHeadersRef}
                    onClick={this.selectHttpHeaders}
                  >
                    {'HTTP Headers ' + this.getHeaderCount()}
                  </span>
                </div>
                {this.state.queryVariablesActive ? (
                  <VariableEditor
                    ref={this.setVariableEditorComponent}
                    value={this.state.variables}
                    variableToType={this.state.variableToType}
                    onEdit={this.handleEditVariables}
                    onHintInformationRender={this.handleHintInformationRender}
                    onRunQuery={this.runQueryAtCursor}
                  />
                ) : (
                  <VariableEditor
                    ref={this.setVariableEditorComponent}
                    value={this.props.session.headers}
                    onEdit={this.props.onChangeHeaders}
                    onRunQuery={this.runQueryAtCursor}
                  />
                )}
              </div>
              <QueryDragBar ref={this.setQueryResizer} />
            </div>
            {!this.props.queryOnly && (
              <div className="resultWrap">
                <ResultDragBar ref={this.setResponseResizer} />
                <ExecuteButton
                  isRunning={Boolean(this.state.subscription)}
                  onRun={this.handleRunQuery}
                  onStop={this.handleStopQuery}
                  operations={this.state.operations}
                />
                {this.state.isWaitingForResponse && <Spinner />}
                <Results
                  setRef={this.setResultComponent}
                  disableResize={this.props.disableResize}
                  responses={this.state.responses}
                  hideGutters={this.props.hideGutters}
                />
                {!this.state.responses ||
                  (this.state.responses.length === 0 && (
                    <div className="intro">
                      Hit the Play Button to get a response here
                    </div>
                  ))}
                {this.props.session.subscriptionActive && (
                  <div className="listening">Listening &hellip;</div>
                )}
                <div
                  className="response-tracing"
                  style={{
                    height: this.state.responseTracingOpen
                      ? this.state.responseTracingHeight
                      : null,
                  }}
                >
                  <div
                    className="response-tracing-title"
                    style={{
                      cursor: this.state.responseTracingOpen
                        ? 'row-resize'
                        : 'n-resize',
                    }}
                    onMouseDown={this.handleTracingResizeStart}
                  >
                    Tracing
                  </div>
                  <ReponseTracing
                    tracing={
                      this.state.responseExtensions &&
                      this.state.responseExtensions.tracing
                    }
                    startTime={this.state.currentQueryStartTime}
                    endTime={this.state.currentQueryEndTime}
                    tracingSupported={this.state.tracingSupported}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <GraphDocs
          ref={this.setDocExplorerRef}
          schema={this.state.schema!}
          sessionId={this.props.session.id}
        />
      </div>
    )
  }

  getCurl = () => {
    let variables
    try {
      variables = JSON.parse(this.state.variables)
    } catch (e) {
      //
    }
    const data = JSON.stringify({
      query: this.state.query,
      variables,
      operationName: this.state.operationName,
    })
    let sessionHeaders

    try {
      sessionHeaders = JSON.parse(this.props.session.headers!)
    } catch (e) {
      //
    }

    const headers = {
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/json',
      Accept: '*/*',
      Connection: 'keep-alive',
      DNT: '1',
      Origin: location.origin || this.props.session.endpoint,
      ...sessionHeaders,
    }
    const headersString = Object.keys(headers)
      .map(key => {
        const value = headers[key]
        return `-H '${key}: ${value}'`
      })
      .join(' ')
    return `curl '${
      this.props.session.endpoint
    }' ${headersString} --data-binary '${data}' --compressed`
  }

  setQueryVariablesRef = ref => {
    this.queryVariablesRef = ref
  }

  setHttpHeadersRef = ref => {
    this.httpHeadersRef = ref
  }

  setQueryResizer = ref => {
    this.queryResizer = ReactDOM.findDOMNode(ref)
  }

  setResponseResizer = ref => {
    this.responseResizer = ReactDOM.findDOMNode(ref)
  }

  setEditorBarComponent = ref => {
    this.editorBarComponent = ref
  }

  setQueryEditorComponent = ref => {
    this.queryEditorComponent = ref
  }

  setVariableEditorComponent = ref => {
    this.variableEditorComponent = ref
  }

  setResultComponent = ref => {
    this.resultComponent = ref
  }

  setDocExplorerRef = ref => {
    if (ref) {
      this.docExplorerComponent = ref.getWrappedInstance()
    }
  }

  handleClickReference = reference => {
    //
  }

  /**
   * Inspect the query, automatically filling in selection sets for non-leaf
   * fields which do not yet have them.
   *
   * @public
   */
  autoCompleteLeafs() {
    const { insertions, result } = fillLeafs(
      this.state.schema,
      this.state.query,
    ) as {
      insertions: Array<{ index: number; string: string }>
      result: string
    }
    if (insertions && insertions.length > 0) {
      const editor = this.queryEditorComponent.getCodeMirror()
      editor.operation(() => {
        const cursor = editor.getCursor()
        const cursorIndex = editor.indexFromPos(cursor)
        editor.setValue(result)
        let added = 0
        try {
          /* tslint:disable-next-line */
          const markers = insertions.map(({ index, string }) =>
            editor.markText(
              editor.posFromIndex(index + added),
              editor.posFromIndex(index + (added += string.length)),
              {
                className: 'autoInsertedLeaf',
                clearOnEnter: true,
                title: 'Automatically added leaf fields',
              },
            ),
          )
          setTimeout(() => markers.forEach(marker => marker.clear()), 7000)
        } catch (e) {
          //
        }
        let newCursorIndex = cursorIndex
        /* tslint:disable-next-line */
        insertions.forEach(({ index, string }) => {
          if (index < cursorIndex && string) {
            newCursorIndex += string.length
          }
        })
        editor.setCursor(editor.posFromIndex(newCursorIndex))
      })
    }

    return result
  }

  // Private methods

  public reloadSchema = async () => {
    try {
      this.setState({ isReloadingSchema: true })
      const result = await this.props.schemaFetcher.refetch(this.props.session)
      if (result) {
        const { schema } = result
        this.setState({
          schema,
          isReloadingSchema: false,
          endpointUnreachable: false,
        })
        this.renewStacks(schema)
      }
    } catch (e) {
      this.setState({
        isReloadingSchema: false,
        endpointUnreachable: true,
      })
    }
  }

  private renewStacks(schema) {
    const rootMap = getRootMap(schema)
    const stacks = this.props.navStack
      .map(stack => {
        return getNewStack(rootMap, schema, stack)
      })
      .filter(s => s)
    this.props.setStacks(this.props.session.id, stacks)
  }

  private ensureOfSchema() {
    // Only perform introspection if a schema is not provided (undefined)
    if (this.state.schema !== undefined) {
      return
    }

    this.props.schemaFetcher
      .fetch(this.props.session)
      .then(result => {
        if (result) {
          const { schema, tracingSupported } = result
          this.renewStacks(schema)
          this.setState({
            schema,
            endpointUnreachable: false,
            tracingSupported,
          })
        }
      })
      .catch(async error => {
        if (error.message === 'Failed to fetch') {
          setTimeout(() => {
            this.setState({
              endpointUnreachable: true,
            })
            this.ensureOfSchema()
          }, 1000)
        } else {
          /* tslint:disable-next-line */
          console.error(error)
          this.setState({
            schema: null,
            responses: [{ date: error.message, time: new Date() }],
          })
        }
      })
  }

  private storageGet = (name: string): any => {
    if (this.storage) {
      const value = this.storage.getItem('graphiql:' + name)
      // Clean up any inadvertently saved null/undefined values.
      if (value === 'null' || value === 'undefined') {
        this.storage.removeItem('graphiql:' + name)
      } else {
        return value
      }
    }
  }

  private storageSet = (name: string, value: any): void => {
    if (this.storage) {
      if (value !== undefined) {
        this.storage.setItem('graphiql:' + name, value)
      } else {
        this.storage.removeItem('graphiql:' + name)
      }
    }
  }

  private fetchQuery(
    query,
    variables: any,
    operationName: string | undefined,
    cb: (value: FetchResult) => void,
  ) {
    const headers = {}
    if (this.state.responseTracingOpen) {
      headers['X-Apollo-Tracing'] = '1'
    }

    const fetch = this.props.fetcher({
      query,
      variables,
      operationName,
      context: {
        headers,
      },
    })

    const subscription = fetch.subscribe({
      next: cb,
      error: error => {
        this.setState({
          isWaitingForResponse: false,
          responses: [
            {
              date: error && String(error.stack || error),
              time: new Date(),
            },
          ],
          subscription: null,
        } as State)
        this.props.onStopQuery()
      },
      complete: () => {
        this.setState({
          isWaitingForResponse: false,
          subscription: null,
        } as State)
        this.props.onStopQuery()
      },
    })

    return subscription
  }

  private getVariables() {
    try {
      return JSON.parse(this.props.session.variables)
    } catch (e) {
      //
    }
    return {}
  }

  private handleRunQuery = selectedOperationName => {
    this.editorQueryID++
    const queryID = this.editorQueryID

    // Use the edited query after autoCompleteLeafs() runs or,
    // in case autoCompletion fails (the function returns undefined),
    // the current query from the editor.
    const editedQuery = this.autoCompleteLeafs() || this.state.query
    const variables = this.getVariables()
    let operationName = this.props.session.operationName

    // If an operation was explicitly provided, different from the current
    // operation name, then report that it changed.
    if (selectedOperationName && selectedOperationName !== operationName) {
      operationName = selectedOperationName
      const onEditOperationName = this.props.onEditOperationName
      if (onEditOperationName) {
        onEditOperationName(operationName)
      }
    }

    try {
      this.setState({
        isWaitingForResponse: true,
        responses: [{ date: null, time: new Date() }],
        operationName,
        nextQueryStartTime: new Date(),
      } as State)

      // _fetchQuery may return a subscription.
      const subscription = this.fetchQuery(
        editedQuery,
        variables,
        operationName,
        (result: any) => {
          if (queryID === this.editorQueryID) {
            let extensions
            if (result.extensions) {
              extensions = { ...result.extensions }
              if (this.props.shouldHideTracingResponse) {
                delete result.extensions
              }
            }
            let responses
            const response = JSON.stringify(result, null, 2)

            if (this.props.session.subscriptionActive) {
              responses = this.state.responses
                .filter(res => res && res.date)
                .slice(0, 100)
                .concat({
                  date: response,
                  time: new Date(),
                  resultID: this.resultID++,
                })
            } else {
              responses = [
                { date: response, time: new Date(), resultID: this.resultID++ },
              ]
            }
            this.setState(state => {
              return {
                isWaitingForResponse: false,
                responses,
                responseExtensions: extensions,
                currentQueryStartTime: state.nextQueryStartTime,
                nextQueryStartTime: undefined,
                currentQueryEndTime: new Date(),
              } as State
            })
          }
        },
      )

      this.setState({ subscription } as State)
    } catch (error) {
      /* tslint:disable-next-line */
      console.error(error)
      this.setState({
        isWaitingForResponse: false,
        responses: [{ date: error.message, time: new Date() }],
      } as State)
    }
  }

  private handleStopQuery = () => {
    const { subscription } = this.state
    this.setState({
      isWaitingForResponse: false,
      subscription: null,
    } as State)
    if (subscription) {
      this.props.onStopQuery()
      try {
        subscription.unsubscribe()
      } catch (e) {
        /* tslint:disable-next-line */
        console.error(e)
      }
    }
  }

  private runQueryAtCursor = () => {
    if (this.state.subscription) {
      this.handleStopQuery()
      return
    }

    let operationName
    const operations = this.state.operations
    if (operations) {
      const editor = this.queryEditorComponent.getCodeMirror()
      if (editor.hasFocus()) {
        const cursor = editor.getCursor()
        const cursorIndex = editor.indexFromPos(cursor)

        // Loop through all operations to see if one contains the cursor.
        for (const operation of operations) {
          if (
            operation.loc.start <= cursorIndex &&
            operation.loc.end >= cursorIndex
          ) {
            operationName = operation.name && operation.name.value
            break
          }
        }
      }
    }

    this.handleRunQuery(operationName)
  }

  private handlePrettifyQuery = () => {
    const query = print(parse(this.state.query))
    const editor = this.queryEditorComponent.getCodeMirror()
    editor.setValue(query)
  }

  private handleEditQuery = value => {
    if (this.state.schema) {
      this.updateQueryFacts(value)
    }
    this.setState({ query: value } as State)
    if (this.props.onEditQuery) {
      return this.props.onEditQuery(value)
    }
    return null
  }

  private handleEditVariables = value => {
    this.setState({ variables: value } as State)
    if (this.props.onEditVariables) {
      this.props.onEditVariables(value)
    }
  }

  private handleHintInformationRender = elem => {
    elem.addEventListener('click', this.onClickHintInformation)

    let onRemoveFn
    elem.addEventListener(
      'DOMNodeRemoved',
      (onRemoveFn = () => {
        elem.removeEventListener('DOMNodeRemoved', onRemoveFn)
        elem.removeEventListener('click', this.onClickHintInformation)
      }),
    )
  }

  private handleResizeStart = downEvent => {
    if (this.props.disableResize) {
      return
    }
    if (!this.didClickDragBar(downEvent)) {
      return
    }

    downEvent.preventDefault()

    const offset = downEvent.clientX - getLeft(downEvent.target)

    let onMouseMove: any = moveEvent => {
      if (moveEvent.buttons === 0) {
        return onMouseUp()
      }

      const editorBar = ReactDOM.findDOMNode(this.editorBarComponent)
      const leftSize = moveEvent.clientX - getLeft(editorBar) - offset
      const rightSize = editorBar.clientWidth - leftSize
      this.setState({ editorFlex: leftSize / rightSize } as State)
    }

    let onMouseUp: any = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      onMouseMove = null
      onMouseUp = null
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  private didClickDragBar(event) {
    // Only for primary unmodified clicks
    return (
      event.target === this.queryResizer ||
      event.target === this.responseResizer
    )
  }

  private handleTracingResizeStart = downEvent => {
    downEvent.preventDefault()

    let didMove = false
    const wasOpen = this.state.responseTracingOpen
    const hadHeight = this.state.responseTracingHeight
    const offset = downEvent.clientY - getTop(downEvent.target)

    let onMouseMove: any = moveEvent => {
      if (moveEvent.buttons === 0) {
        return onMouseUp()
      }

      didMove = true

      const editorBar = ReactDOM.findDOMNode(this.editorBarComponent)
      const topSize = moveEvent.clientY - getTop(editorBar) - offset
      const bottomSize = editorBar.clientHeight - topSize
      if (bottomSize < 60) {
        this.setState({
          responseTracingOpen: false,
          responseTracingHeight: hadHeight,
        } as State)
      } else {
        this.setState({
          responseTracingOpen: true,
          responseTracingHeight: bottomSize,
        } as State)
      }
    }

    let onMouseUp: any = () => {
      if (!didMove) {
        this.setState({ responseTracingOpen: !wasOpen } as State)
      }

      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      onMouseMove = null
      onMouseUp = null
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  private selectQueryVariables = () => {
    this.setState({ queryVariablesActive: true })
    this.storageSet('queryVariablesActive', 'true')
  }

  private selectHttpHeaders = () => {
    this.setState({ queryVariablesActive: false })
    this.storageSet('queryVariablesActive', 'false')
  }

  private handleVariableResizeStart = downEvent => {
    downEvent.preventDefault()

    let didMove = false
    const wasOpen = this.state.variableEditorOpen
    const hadHeight = this.state.variableEditorHeight
    const offset = downEvent.clientY - getTop(downEvent.target)

    if (
      wasOpen &&
      (downEvent.target === this.queryVariablesRef ||
        downEvent.target === this.httpHeadersRef)
    ) {
      return
    }

    let onMouseMove: any = moveEvent => {
      if (moveEvent.buttons === 0) {
        return onMouseUp()
      }

      didMove = true

      const editorBar = ReactDOM.findDOMNode(this.editorBarComponent)
      const topSize = moveEvent.clientY - getTop(editorBar) - offset
      const bottomSize = editorBar.clientHeight - topSize
      if (bottomSize < 60) {
        this.setState({
          variableEditorOpen: false,
          variableEditorHeight: hadHeight,
        } as State)
      } else {
        this.setState({
          variableEditorOpen: true,
          variableEditorHeight: bottomSize,
        } as State)
      }
    }

    let onMouseUp: any = () => {
      if (!didMove) {
        this.setState({ variableEditorOpen: !wasOpen } as State)
      }

      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      onMouseMove = null
      onMouseUp = null
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  private onClickHintInformation = event => {
    if (event.target.className === 'typeName') {
      const typeName = event.target.innerHTML
      const schema = this.state.schema
      if (schema) {
        // TODO: There is no way as of now to retrieve the NAMED_TYPE of a GraphQLList(Type).
        // We're therefore removing any '[' or '!' characters, to properly find its NAMED_TYPE. (eg. [Type!]! => Type)
        // This should be removed as soon as there's a safer way to do that.
        const namedTypeName = typeName.replace(/[\]\[!]/g, '')
        const type = schema.getType(namedTypeName)

        if (isNamedType(type)) {
          this.docExplorerComponent.showDocFromType(type)
        }
      }
    }
  }
}

export default withTheme<Props>(
  // TODO fix redux types
  connect<any, any, any>(getSessionDocs, { setStacks }, null, {
    withRef: true,
  })(GraphQLEditor),
)

const DragBar = styled.div`
  width: 15px;
  position: absolute;
  top: 0;
  bottom: 0;
  cursor: col-resize;
`

const QueryDragBar = styled(DragBar)`
  right: 0px;
`

const ResultDragBar = styled(DragBar)`
  left: 0px;
  z-index: 1;
`
