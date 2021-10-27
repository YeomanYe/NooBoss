import React, { Component } from 'react';
import styled, { css } from 'styled-components';
import ExtensionBrief from './ExtensionBrief';
import GroupBrief from './GroupBrief';
import { GL, promisedGetDB, promisedSetDB, sendMessage } from '../../utils';
import { Listy, Tiley, BigTiley, Cleary } from '../../icons';

const SelectorDiv = styled.div`
  overflow: visible;
  padding-bottom: 10px;
  #viewDiv {
    margin-bottom: -50px;
    overflow: hidden;
    svg {
      float: right;
      cursor: pointer;
    }
    #list {
      opacity: ${(props) => (props.viewMode === 'list' ? '1' : '0.3')};
    }
    #tile {
      opacity: ${(props) => (props.viewMode === 'tile' ? '1' : '0.3')};
    }
    #bigTile {
      opacity: ${(props) => (props.viewMode === 'bigTile' ? '1' : '0.3')};
    }
  }
  #actionBar {
    margin-left: 0px;
    margin-top: 20px;
    height: 26px;
    #typeFilter {
      height: 21px;
    }
    * {
      margin-right: 16px;
      float: left;
      display: block;
      margin-top: 0px;
    }
    button {
      min-width: ${(props) =>
        props.withControl === 'group' ? '70px' : '80px'};
      margin-top: -3px;
      margin-right: 8px;
    }
    #clearNameFilter {
      display: inline-block;
      margin-left: -36px;
      height: 20px;
      margin-right: 16px;
      width: 20px;
      text-align: center;
      cursor: pointer;
      background-color: rgba(255, 255, 255, 0.8);
      svg {
        width: 20px;
        height: 20px;
      }
    }
    #nameFilter {
      &[value=''] + #clearNameFilter {
        display: none;
      }
    }
  }
  #extensionList,
  #appList,
  #themeList,
  #groupList {
    clear: both;
    padding-top: 12px;
    zoom: ${(props) => props.zoom || 1};
  }
  ${(props) =>
    props.viewMode === 'tile' &&
    css`
      #extensionList,
      #appList,
      #themeList,
      #groupList {
        zoom: ${(props) => (props.zoom ? props.zoom * 1.08325 : 1)};
      }
    `}
`;

class Selector extends Component {
  constructor(props) {
    super(props);
    this.state = {
      filterName: '',
      filterType: 'all',
      stateHistoryList: [],
      redoStateHistoryList: []
    };
  }

  enable(extensionIds = this.getFiltered()) {
    const stateHistory = {};
    extensionIds.map((id) => {
      const extension = this.props.extensions[id];
      if (!extension.enabled) {
        stateHistory[extension.id] = extension.enabled;
        sendMessage(
          {
            job: 'extensionToggle',
            id: extension.id,
            enabled: !extension.enabled
          },
          () => {}
        );
      }
    });
    this.addStateHistory(stateHistory);
  }

  disable(extensionIds = this.getFiltered()) {
    const stateHistory = {};
    extensionIds.map((id) => {
      const extension = this.props.extensions[id];
      if (extension.enabled) {
        stateHistory[extension.id] = extension.enabled;
        sendMessage(
          {
            job: 'extensionToggle',
            id: extension.id,
            enable: !extension.enabled
          },
          () => {}
        );
      }
    });
    this.addStateHistory(stateHistory);
  }

  async setHistoryList() {
    const historyMap = (await promisedGetDB('historyMap')) || {};
    const { stateHistoryList = [], redoStateHistoryList = [] } = this.state;
    historyMap[this.props.id] = {
      stateHistoryList,
      redoStateHistoryList
    };
    await promisedSetDB('historyMap', historyMap);
  }

  undo() {
    this.setState(
      (prevState) => {
        const stateHistory = prevState.stateHistoryList.pop() || {};
        const redoStateHistory = {};
        Object.keys(stateHistory).map((id) => {
          switch (id) {
            case 'groupList':
              redoStateHistory.groupList = JSON.parse(
                JSON.stringify(this.props.groupList)
              );
              sendMessage({
                job: 'groupListUpdate',
                groupList: stateHistory.groupList
              });
              break;
            default:
              redoStateHistory[id] = this.props.extensions[id].enabled;
              sendMessage({
                job: 'extensionToggle',
                id,
                enabled: stateHistory[id]
              });
          }
        });
        prevState.redoStateHistoryList.push(redoStateHistory);
        return prevState;
      },
      () => this.setHistoryList()
    );
  }

  redo() {
    this.setState(
      (prevState) => {
        const redoStateHistory = prevState.redoStateHistoryList.pop() || {};
        const stateHistory = {};
        Object.keys(redoStateHistory).map((id) => {
          switch (id) {
            case 'groupList':
              stateHistory.groupList = JSON.parse(
                JSON.stringify(this.props.groupList)
              );
              sendMessage({
                job: 'groupListUpdate',
                groupList: redoStateHistory.groupList
              });
              break;
            default:
              stateHistory[id] = this.props.extensions[id].enabled;
              sendMessage({
                job: 'extensionToggle',
                id,
                enabled: redoStateHistory[id]
              });
          }
        });
        prevState.stateHistoryList.push(stateHistory);
        return prevState;
      },
      () => this.setHistoryList()
    );
  }

  addStateHistory(stateHistory) {
    this.setState(
      (prevState) => {
        prevState.stateHistoryList.push(stateHistory);
        prevState.redoStateHistoryList = [];
        return prevState;
      },
      () => this.setHistoryList()
    );
  }

  getFiltered(type) {
    const extensions = this.props.extensions;
    // 全部组的扩展id
    const groupExts = new Set();
    if (this.props.allGroup) {
      this.props.allGroup.forEach((g) => {
        g.appList.forEach((item) => groupExts.add(item));
      });
    }
    return Object.keys(extensions).filter((elem) => {
      const extension = extensions[elem];
      // There is a bug: Extensions[undefined] = { enabled: true }
      if (!extension) {
        return;
      }
      let pass = true;
      switch (this.props.filterType) {
        case 'chromeWebStoreExtensionOnly':
          if (
            extension.installType === 'development' ||
            (extension.updateUrl &&
              extension.updateUrl.indexOf('clients2.google.com') === -1) ||
            (extension.homepageUrl &&
              extension.homepageUrl.indexOf('ext.chrome.360.cn') !== -1)
          ) {
            pass = false;
          }
          break;
      }
      if (
        type &&
        ((extension.name.match(/NooBoss-Group/) && type === 'group') ||
          extension.type !== type)
      ) {
        pass = false;
      } else if (
        extension.name
          .toLowerCase()
          .indexOf(this.state.filterName.toLowerCase()) === -1
      ) {
        pass = false;
      } else {
        switch (this.state.filterType) {
          case 'all':
            break;
          case 'group':
            if (!extension.name.match(/^NooBoss-Group/)) {
              pass = false;
            }
            break;
          case 'in_current_group':
            pass = this.props.selectedList.includes(extension.id);
            break;
          case 'not_in_current_group':
            pass = !this.props.selectedList.includes(extension.id);
            break;
          case 'not_other_group':
            pass =
              !groupExts.has(extension.id) ||
              this.props.selectedList.includes(extension.id);
            break;
          case 'not_in_group':
            pass = !groupExts.has(extension.id);
            break;
          case 'development':
            pass =
              extension.installType ===
              browser.management.ExtensionInstallType.DEVELOPMENT;
            break;
          case 'offlineEnabled':
            pass = extension.offlineEnabled;
            break;
          case 'enabled':
            pass = extension.enabled;
            break;
          case 'disabled':
            pass = !extension.enabled;
            break;
          default:
            if ((extension.type || '').indexOf(this.state.filterType) === -1) {
              pass = false;
            }
        }
      }
      return pass;
    });
  }

  groupToggle(id, enabled) {
    const stateHistory = {};
    const group = this.props.groupList.filter((elem) => {
      return elem.id === id;
    })[0];
    group.appList.map((elem) => {
      if (
        enabled !== undefined &&
        this.props.extensions[elem].enabled !== enabled
      ) {
        stateHistory[elem] = !enabled;
      }
    });
    this.addStateHistory(stateHistory);
    sendMessage({ job: 'groupToggle', id, enabled });
  }

  groupCopy(id) {
    const groupList = JSON.parse(JSON.stringify(this.props.groupList));
    this.addStateHistory({ groupList });
    sendMessage({ job: 'groupCopy', id });
  }

  groupRemove(id) {
    const groupList = JSON.parse(JSON.stringify(this.props.groupList));
    this.addStateHistory({ groupList });
    sendMessage({ job: 'groupRemove', id });
  }

  newGroup() {
    sendMessage({ job: 'newGroup' });
  }

  async componentDidMount() {
    if (this.props.actionBar) {
      this.nameFilter.focus();
    }
    const historyMap = (await promisedGetDB('historyMap')) || {};
    const { stateHistoryList = [], redoStateHistoryList = [] } =
      historyMap[this.props.id] || {};
    this.setState({ stateHistoryList, redoStateHistoryList });
  }

  render() {
    const extensions = this.props.extensions;
    const appList = [],
      extensionList = [],
      themeList = [];
    this.getFiltered()
      .map((id) => {
        return extensions[id];
      })
      .sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      })
      .map((extension, index) => {
        const id = extension.id;
        const x = (
          <ExtensionBrief
            viewMode={this.props.viewMode}
            selected={
              this.props.selectedList
                ? this.props.selectedList.indexOf(id) !== -1
                : null
            }
            onClick={() => {
              if (this.props.select) {
                this.props.select(id);
              }
            }}
            icon={this.props.icons[extension.icon]}
            addStateHistory={this.addStateHistory.bind(this)}
            extension={extension}
            withControl={this.props.withControl}
            key={index}
            updateSubWindow={this.props.updateSubWindow}
          />
        );
        switch (extension.type) {
          case 'extension':
            extensionList.push(x);
            break;
          case 'app':
          case 'hosted_app':
            appList.push(x);
            break;
          case 'packaged_app':
            appList.push(x);
            break;
          case 'theme':
            themeList.push(x);
            break;
        }
      });
    const groupList = [];
    (this.props.groupList || [])
      .sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      })
      .map((group, index) => {
        if (
          (this.state.filterName === '' ||
            group.name.indexOf(this.state.filterName)) !== -1 &&
          (this.state.filterType === 'all' || this.state.filterType === 'group')
        ) {
          const id = group.id;
          groupList.push(
            <GroupBrief
              group={group}
              withControl={true}
              key={index}
              viewMode={this.props.viewMode}
              selected={
                this.props.selectedList
                  ? this.props.selectedList.indexOf(id) !== -1
                  : null
              }
              onClick={() => {
                if (this.props.select) {
                  this.props.select(id);
                }
              }}
              icon={this.props.icons[id + '_icon']}
              enable={this.groupToggle.bind(this, id, true)}
              disable={this.groupToggle.bind(this, id, false)}
              copy={this.groupCopy.bind(this, id)}
              remove={this.groupRemove.bind(this, id)}
              updateSubWindow={this.props.updateSubWindow}
            />
          );
        }
      });
    let selectGroup;
    if (this.props.groupList) {
      selectGroup = [<option value='group'>{GL('group')}</option>];
    } else {
      selectGroup = [
        <option value='not_other_group'>{GL('not_other_group')}</option>,
        <option value='in_current_group'>{GL('in_current_group')}</option>,
        <option value='not_in_current_group'>
          {GL('not_in_current_group')}
        </option>
      ];
    }
    let actionBar;
    if (this.props.actionBar) {
      let buttonEnable, buttonDisable, buttonUndo, buttonRedo, buttonNewGroup;
      if (this.props.withControl) {
        buttonUndo = (
          <button
            className={this.state.stateHistoryList.length > 0 ? '' : 'inActive'}
            onClick={this.undo.bind(this)}>
            {GL('undo')}
          </button>
        );
        buttonRedo = (
          <button
            className={
              this.state.redoStateHistoryList.length > 0 ? '' : 'inActive'
            }
            onClick={this.redo.bind(this)}>
            {GL('redo')}
          </button>
        );
        if (this.props.withControl === 'group') {
          buttonEnable = (
            <button onClick={() => this.enable(this.state.filterType === 'all' ? this.props.selectedList : undefined)}>
              {GL('enable')}
            </button>
          );
          buttonDisable = (
            <button onClick={() => this.disable(this.state.filterType === 'all' ? this.props.selectedList : undefined)}>
              {GL('disable')}
            </button>
          );
        } else {
          buttonEnable = (
            <button onClick={() => this.enable()}>{GL('enable')}</button>
          );
          buttonDisable = (
            <button onClick={() => this.disable()}>{GL('disable')}</button>
          );
          buttonNewGroup = (
            <button onClick={this.newGroup.bind(this)}>
              {GL('new_group')}
            </button>
          );
        }
      }
      actionBar = (
        <div id='actionBar'>
          <select
            defaultValue={this.state.filterType}
            onChange={(e) => {
              this.setState({ filterType: e.target.value });
            }}
            id='typeFilter'>
            <option value='all'>{GL('all')}</option>
            {selectGroup}
            <option value='not_in_group'>{GL('not_in_group')}</option>
            <option value='development'>{GL('development')}</option>
            <option value='enabled'>{GL('enabled')}</option>
            <option value='disabled'>{GL('disabled')}</option>
            <option value='offlineEnabled'>{GL('offlineEnabled')}</option>
            <option value='app'>{GL('app')}</option>
            <option value='extension'>{GL('extension')}</option>
            <option value='theme'>{GL('theme')}</option>
          </select>
          <input
            id='nameFilter'
            placeholder={GL('name')}
            ref={(input) => {
              this.nameFilter = input;
            }}
            // https://github.com/facebook/react/issues/3926
            defaultValue={this.state.filterName}
            onChange={(e) => {
              this.setState({ filterName: e.target.value });
            }}
          />
          <span
            id='clearNameFilter'
            onClick={() => {
              this.setState({ filterName: '' });
              this.nameFilter.focus();
            }}>
            <Cleary color={shared.themeSubColor} />
          </span>
          {buttonEnable}
          {buttonDisable}
          {buttonUndo}
          {buttonRedo}
          {buttonNewGroup}
        </div>
      );
    }
    let appDiv, extensionDiv, themeDiv, groupDiv;
    if (appList.length > 0) {
      appDiv = (
        <div id='appList'>
          <h2>{GL('app')}</h2>
          {appList}
        </div>
      );
    }
    if (extensionList.length > 0) {
      extensionDiv = (
        <div id='extensionList'>
          <h2>{GL('extension')}</h2>
          {extensionList}
        </div>
      );
    }
    if (themeList.length > 0) {
      themeDiv = (
        <div id='themeList'>
          <h2>{GL('theme')}</h2>
          {themeList}
        </div>
      );
    }
    if (groupList.length > 0) {
      groupDiv = (
        <div id='groupList'>
          <h2>{GL('group')}</h2>
          {groupList}
        </div>
      );
    }
    const view = (
      <div id='viewDiv'>
        <Tiley
          id='tile'
          onClick={sendMessage.bind(
            null,
            { job: 'set', key: 'viewMode', value: 'tile' },
            () => {}
          )}
          color={shared.themeMainColor}
        />
        <BigTiley
          id='bigTile'
          onClick={sendMessage.bind(
            null,
            { job: 'set', key: 'viewMode', value: 'bigTile' },
            () => {}
          )}
          color={shared.themeMainColor}
        />
        <Listy
          id='list'
          onClick={sendMessage.bind(
            null,
            { job: 'set', key: 'viewMode', value: 'list' },
            () => {}
          )}
          color={shared.themeMainColor}
        />
      </div>
    );
    let tttt = (
      <BigTiley
        id='bigTile'
        onClick={sendMessage.bind(
          null,
          { job: 'set', key: 'viewMode', value: 'bigTile' },
          () => {}
        )}
        color={shared.themeMainColor}
      />
    );
    return (
      <SelectorDiv
        zoom={this.props.zoom}
        viewMode={this.props.viewMode}
        withControl={this.props.withControl}>
        {actionBar}
        {view}
        {groupDiv}
        {extensionDiv}
        {appDiv}
        {themeDiv}
      </SelectorDiv>
    );
  }
}

Selector.defaultProps = {
  id: 'Nooboss-All'
};

export default Selector;
