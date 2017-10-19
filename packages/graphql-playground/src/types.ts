export type Viewer = 'ADMIN' | 'EVERYONE' | 'USER'

export interface Session {
  id: string
  name?: string

  query: string
  variables: string
  result?: string
  // result: string
  operationName?: string
  subscriptionActive: boolean

  // additional props that are interactive in graphiql, these are not represented in graphiqls state
  selectedViewer: Viewer
  queryTypes: QueryTypes
  starred?: boolean
  date: Date
  hasMutation: boolean
  hasSubscription: boolean
  hasQuery: boolean
  selectedUserToken?: string
  subscriptionId?: string
  headers?: any[]
  permission?: PermissionSession
}

export interface PermissionSession {
  relationName?: string
  modelName?: string
  modelOperation?: string
}

export interface QueryTypes {
  firstOperationName: string | null
  subscription: boolean
  query: boolean
  mutation: boolean
  permission?: boolean
  // operations: OperationDefinition[]
}

export interface OperationDefinition {
  startLine: number
  endLine: number
  name: string
}

export type HistoryFilter = 'HISTORY' | 'STARRED'

export type Environment = 'Node' | 'Browser' | 'Cli'
export type GraphQLClient =
  | 'fetch'
  | 'relay'
  | 'apollo'
  | 'graphql-request'
  | 'curl'

export interface ServiceInformation {
  relations: GraphcoolRelation[]
  models: GraphcoolModel[]
}

export interface GraphcoolRelation {
  id: string
  name: string
  permissionQueryArguments: PermissionQueryArgument[]
  leftModel: {
    name: string
  }
}

export interface GraphcoolModel {
  id: string
  name: string
  create: PermissionQueryArgument[]
  read: PermissionQueryArgument[]
  update: PermissionQueryArgument[]
  delete: PermissionQueryArgument[]
}

export interface PermissionQueryArgument {
  name: string
  typeName: string
  group: string
}
