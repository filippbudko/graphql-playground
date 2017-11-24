import * as React from 'react'
import Icon from 'graphcool-styles/dist/components/Icon/Icon'
import { $v } from 'graphcool-styles'
import ToggleButton from './ToggleButton'
import Tooltip from './Tooltip'
import { LocalThemeInterface } from './Theme'
import * as cn from 'classnames'
import { Button } from './Button'
import Copy from './Copy'
import styled, { keyframes } from '../styled'

export interface Props extends LocalThemeInterface {
  allTabs: boolean
  httpHeaders: boolean
  history: boolean
  onToggleAllTabs: () => void
  onToggleHttpHeaders: () => void
  onToggleHistory: () => void
  onShare: () => void
  shareUrl?: string
  reshare: boolean
  isSharingAuthorization: boolean
}

export interface State {
  open: boolean
}

export default class Share extends React.Component<Props, State> {
  constructor(props) {
    super(props)
    this.state = {
      open: false,
    }
  }
  render() {
    const { open } = this.state
    const {
      allTabs,
      httpHeaders,
      history,
      onToggleAllTabs,
      onToggleHistory,
      onToggleHttpHeaders,
      localTheme,
      shareUrl,
      onShare,
      reshare,
    } = this.props
    return (
      <Wrapper>
        <style jsx={true}>{`
          .settings {
            @p: .absolute;
            z-index: 1005;
            right: 96px;
            top: 13px;
          }
          .tooltip-text {
            @p: .mr10, .darkBlue50, .fw6, .ttu, .f14;
            letter-spacing: 0.53px;
          }
          .icon {
            @p: .pointer, .relative;
          }
          .tooltip {
            @p: .absolute;
            right: -21px;
          }
          .row {
            @p: .flex, .itemsCenter, .justifyBetween, .relative;
            min-width: 245px;
          }
          .copy {
            @p: .absolute, .right0;
          }
          .row + .row {
            @p: .mt16;
          }
          .button {
            @p: .br2, .f14, .fw6, .ttu, .flex, .itemsCenter, .white40;
            border: 1.5px solid rgba(255, 255, 255, 0.2);
            padding: 5px 9px 6px 9px;
          }
          .button:hover,
          .button.open {
            @p: .bWhite70, .white80;
          }
          .button span {
            @p: .ml10;
          }
          .button.light {
            @p: .bDarkBlue10, .darkBlue40;
          }
          .button.light:hover,
          .button.light.open {
            @p: .bDarkBlue70, .darkBlue80;
          }
          .button.light:hover :global(svg),
          .button.light.open :global(svg) {
            stroke: $darkBlue80;
          }
          .button:hover :global(svg),
          .button.open :global(svg) {
            stroke: $white80;
          }
          input {
            @p: .bgDarkBlue10, .br2, .pv6, .ph10, .fw6, .darkBlue, .f12, .db,
              .w100;
          }
          .copy:hover :global(svg) {
            fill: $darkBlue60;
          }
        `}</style>
        <IconWrapper>
          <div
            className={cn('button', localTheme, { open })}
            onClick={this.toggleTooltip}
          >
            <Icon
              src={require('../assets/icons/share.svg')}
              color={localTheme === 'light' ? $v.darkBlue40 : $v.white40}
              stroke={true}
              width={13}
              height={13}
            />
            <span>Share</span>
          </div>
          <TooltipWrapper>
            <Tooltip
              open={open}
              onClose={this.toggleTooltip}
              anchorOrigin={{
                horizontal: 'right',
                vertical: 'bottom',
              }}
              renderAfterContent={this.renderAuthSharingWarning}
            >
              <div>
                <Row>
                  <TooltipText onClick={onToggleAllTabs}>
                    Share all tabs{' '}
                  </TooltipText>
                  <ToggleButton checked={allTabs} onChange={onToggleAllTabs} />
                </Row>
                <Row>
                  <TooltipText onClick={onToggleHttpHeaders}>
                    HTTP headers{' '}
                  </TooltipText>
                  <ToggleButton
                    checked={httpHeaders}
                    onChange={onToggleHttpHeaders}
                  />
                </Row>
                <Row>
                  <TooltipText onClick={onToggleHistory}>History </TooltipText>
                  <ToggleButton checked={history} onChange={onToggleHistory} />
                </Row>
                {shareUrl && (
                  <Row>
                    <Input value={shareUrl} disabled={true} />
                    <CopyWrapper>
                      <Copy text={shareUrl}>
                        <Icon
                          src={require('graphcool-styles/icons/fill/copy.svg')}
                          color={$v.darkBlue30}
                          width={25}
                          height={25}
                        />
                      </Copy>
                    </CopyWrapper>
                  </Row>
                )}
                <Row>
                  <div />
                  <Button hideArrow={true} onClick={onShare}>
                    {reshare && shareUrl ? 'Reshare' : 'Share'}
                  </Button>
                </Row>
              </div>
            </Tooltip>
          </TooltipWrapper>
        </IconWrapper>
      </Wrapper>
    )
  }

  private renderAuthSharingWarning = () => {
    if (!this.props.isSharingAuthorization) {
      return null
    }

    return <AuthSharingWarning />
  }

  private toggleTooltip = () => {
    this.setState(state => ({ open: !state.open }))
  }
}

const AuthSharingWarning = () => (
  <Message>
    <MessageTitle>Watch out!</MessageTitle>
    You’re sharing your <code>Authorization</code> header with the world!
  </Message>
)

// TODO: use theme

const pulse = keyframes`
  0% {
    transform: scale(1.04);
  }

  100% {
    transform: scale(1);
  }
`

const Message = styled.div`
  padding: 12px 16px;
  margin-top: 10px;

  font-size: 14px;
  letter-spacing: normal;

  cursor: default;
  border-radius: 2px;
  background: #f3f4f4;
  box-shadow: 0 1px 6px 0 rgba(0, 0, 0, 0.15);

  animation: ${pulse} 0.7s ease-in-out infinite alternate;
`

const MessageTitle = styled.div`
  margin-right: 3px;
  margin-bottom: 2px;
  font-weight: bold;
  color: #2a7ed2;
`

// Main styled components
const Wrapper = styled.div`
  position: absolute;
  right: 96px;
  top: 13px;
  z-index: 1005;
`

const TooltipText = styled.div`
  margin-right: 10px;

  font-size: ${p => p.theme.sizes.fontSmall};
  font-weight: ${p => p.theme.sizes.fontSemiBold};
  text-transform: uppercase;
  letter-spacing: 0.53px;

  color: ${p => p.theme.colours.darkBlue50};
`

const IconWrapper = styled.div`
  position: relative;
  cursor: pointer;
`

const TooltipWrapper = styled.div`
  position: absolute;
  right: -21px;
`

const Row = styled.div`
  position: relative;
  min-width: 245px;
  margin-top: ${p => p.theme.sizes.small16};

  display: flex;
  align-items: center;
  justify-content: space-between;

  &:first-child {
    margin-top: 0;
  }
`

const CopyWrapper = styled.div`
  position: absolute;
  right: 0;

  &:hover {
    svg {
      fill: ${p => p.theme.colours.darkBlue60};
    }
  }
`

const Input = styled.input`
  display: block;
  width: 100%;
  padding: ${p => p.theme.sizes.small6} ${p => p.theme.sizes.small10};

  font-weight: ${p => p.theme.sizes.fontSemiBold};
  font-size: ${p => p.theme.sizes.fontTiny};

  border-radius: ${p => p.theme.sizes.smallRadius};
  background: ${p => p.theme.colours.darkBlue10};
  color: ${p => p.theme.colours.darkBlue};
`
