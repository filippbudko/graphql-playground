import * as React from 'react'
import * as cx from 'classnames'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { GraphQLList, GraphQLNonNull, isType } from 'graphql'
import { Icon } from 'graphcool-styles'
import ArgumentInline from './ArgumentInline'
import { addStack } from '../../../actions/graphiql-docs'

interface StateFromProps {
  navStack: any[]
  keyMove: boolean
}

interface DispatchFromProps {
  addStack: (field: any, x: number, y: number) => any
}

export interface Props {
  type: any
  // X position in the list
  x: number
  // Y position in the list
  y: number
  clickable?: boolean
  className?: string
  beforeNode?: JSX.Element | null | false
  afterNode?: JSX.Element | null | false
  onSetWidth: (width: number) => void
  showParentName?: boolean
}

class TypeLink extends React.Component<
  Props & StateFromProps & DispatchFromProps,
  {}
> {
  static defaultProps: Partial<Props> = {
    clickable: true,
  }
  private ref: any

  shouldComponentUpdate(nextProps: Props & StateFromProps) {
    return (
      this.props.type !== nextProps.type ||
      this.props.navStack[this.props.x] !== nextProps.navStack[this.props.x] ||
      this.props.navStack.length !== nextProps.navStack.length ||
      this.props.keyMove !== nextProps.keyMove
    )
  }

  onClick = () => {
    if (this.props.clickable) {
      this.props.addStack(this.props.type, this.props.x, this.props.y)
    }
  }

  isActive(navStack: any[], x: number, y: number) {
    return navStack[x] && navStack[x].x === x && navStack[x].y === y
  }

  componentDidMount() {
    this.sendWidth()
  }

  componentDidUpdate() {
    this.sendWidth()
  }

  sendWidth() {
    if (typeof this.props.onSetWidth === 'function' && this.ref) {
      this.props.onSetWidth(this.ref.scrollWidth)
    }
  }

  setRef = ref => {
    this.ref = ref
  }

  render() {
    const {
      type,
      clickable,
      navStack,
      className,
      beforeNode,
      afterNode,
      x,
      y,
      keyMove,
      showParentName,
    } = this.props
    const isActive = clickable && this.isActive(navStack, x, y)
    const isLastActive = isActive && x === navStack.length - 1
    const isGraphqlType = isType(type)

    const fieldName =
      showParentName && type.parent
        ? <span>
            {type.parent.name}.<b>{type.name}</b>
          </span>
        : type.name

    return (
      <div
        className={cx('doc-category-item', className, {
          clickable,
          active: isActive,
          'last-active': isLastActive,
          'no-hover': keyMove,
        })}
        onClick={this.onClick}
        ref={this.setRef}
      >
        <style jsx={true}>{`
          .doc-category-item {
            @p: .mv0, .ph16, .pv6, .relative, .overflowAuto, .f14;
            transition: $duration background-color;
          }
          .doc-category-item.clickable:hover {
            @p: .pointer, .white;
          }
          .doc-category-item.active {
            @p: .bgBlack07;
          }
          .doc-category-icon {
            @p: .absolute;
            right: 10px;
            top: calc(50% - 4px);
          }
        `}</style>
        <style jsx={true} global={true}>{`
          .doc-category-item.last-active,
          .doc-category-item.clickable:hover:not(.no-hover) {
            background-color: #2a7ed3 !important;
            color: #fff !important;
            z-index: 1;

            & .field-name,
            & .type-name,
            & .arg-name {
              color: #fff !important;
            }
          }
          .doc-category-item.active:not(.last-active) svg {
            fill: #2a7ed3 !important;
          }
          .doc-category-item b {
            @p: .fw6;
          }
        `}</style>
        {beforeNode}
        {beforeNode && ' '}
        {!isGraphqlType &&
          <span>
            <span className="field-name">
              {fieldName}
            </span>
            {type.args &&
            type.args.length > 0 && [
              '(',
              <span key="args">
                {type.args.map(arg =>
                  <ArgumentInline key={arg.name} arg={arg} />,
                )}
              </span>,
              ')',
            ]}
            {': '}
          </span>}
        <span className="type-name">
          {renderType(type.type || type)}
        </span>
        {clickable &&
          <span className="doc-category-icon">
            <Icon
              src={require('graphcool-styles/icons/fill/triangle.svg')}
              color="rgba(0, 0, 0, .2)"
              width={6}
              height={7}
            />
          </span>}
        {afterNode && ' '}
        {afterNode}
      </div>
    )
  }
}

function renderType(type) {
  if (type instanceof GraphQLNonNull) {
    return (
      <span>
        {renderType(type.ofType)}
        {'!'}
      </span>
    )
  }
  if (type instanceof GraphQLList) {
    return (
      <span>
        {'['}
        {renderType(type.ofType)}
        {']'}
      </span>
    )
  }
  return (
    <span>
      {type.name}
    </span>
  )
}

const mapStateToProps = state => ({
  navStack: state.graphiqlDocs.navStack,
  keyMove: state.graphiqlDocs.keyMove,
})

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      addStack,
    },
    dispatch,
  )

export default connect<StateFromProps, DispatchFromProps, Props>(
  mapStateToProps,
  mapDispatchToProps,
)(TypeLink)
