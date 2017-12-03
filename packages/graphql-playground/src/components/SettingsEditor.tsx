import * as React from 'react'
import { styled } from '../styled'
import * as theme from 'styled-theming'
import { Button } from './Playground/TopBar/TopBar'
import { ConfigEditor } from './Playground/ConfigEditor'

export interface Props {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  isYaml?: boolean
  isConfig?: boolean
  readOnly?: boolean
}

// TODO: Trigger onSave on CMD+S or CTRL+S

export default class SettingsEditor extends React.Component<Props, {}> {
  componentDidMount() {
    window.addEventListener('keydown', this.handleKeydown, true)
  }

  render() {
    const { isConfig } = this.props
    return (
      <Wrapper className="graphiql-container">
        <div className="editorWrap">
          <div className="variable-editor">
            <ConfigEditor
              value={this.props.value}
              onEdit={this.props.onChange}
              onRunQuery={this.props.onSave}
              isYaml={this.props.isYaml}
              readOnly={this.props.readOnly}
            />
          </div>
        </div>
        {!this.props.readOnly && (
          <ButtonWrapper>
            <Button onClick={this.props.onSave}>
              Save {isConfig ? `Config` : `Settings`}
            </Button>
          </ButtonWrapper>
        )}
      </Wrapper>
    )
  }

  private handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 's' && e.metaKey) {
      e.preventDefault()
      this.props.onSave()
    }
  }
}

const backgroundColor = theme('mode', {
  light: p => p.theme.colours.darkBlue10,
  dark: p => p.theme.colours.darkBlue,
})

const Wrapper = styled.div`
  background: ${backgroundColor};
  position: relative;
  .variable-editor {
    height: 100% !important;
  }
  .CodeMirror {
    background: none !important;
    .CodeMirror-code {
      color: rgba(255, 255, 255, 0.7);
    }
    .cm-atom {
      color: rgba(42, 126, 210, 1);
    }
  }
  .CodeMirror-gutters {
    background: none !important;
  }
`

const ButtonWrapper = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 2;
`
