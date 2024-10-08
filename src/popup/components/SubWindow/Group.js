import React, { Component } from 'react';
import styled from 'styled-components';
import { Closey, Groupy } from '../../../icons';
import {
  promisedDeleteDB,
  getSquareImg,
  sendMessage,
  fileToDataURL,
  promisedSetDB
} from '../../../utils';
import Selector from '../Selector';

const GroupDiv = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  cursor: initial;
  display: flex;
  overflow-y: scroll;
  &::-webkit-scrollbar-track {
    background: white;
  }
  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${(props) => window.shared.themeMainColor};
  }
  section {
    width: 90%;
  }
  #name {
    margin-top: 10px;
    font-size: 36px;
    height: 36px;
    width: 333px;
  }
  #selectedList {
    margin-top: 20px;
    height: 23px;
    img {
      width: 22px;
      height: 22px;
    }
  }
  #iconHolder {
    width: 109px;
    height: 109px;
    display: block;
    position: absolute;
    top: 10px;
    right: 27px;
    cursor: pointer;
    #icon {
      width: 100%;
      height: 100%;
    }
    svg#icon {
      width: 100%;
      height: 100%;
    }
    &:hover {
      & + #deleteIcon {
        display: block;
      }
    }
  }
  #deleteIcon {
    display: none;
    position: absolute;
    right: 27px;
    top: 10px;
    background: rgba(200, 200, 200, 0.68);
    cursor: pointer;
    width: 33px;
    height: 33px;
    &:hover {
      display: block;
    }
  }
  #padder {
    height: 16px;
    float: left;
    width: 100%;
  }
`;

class Group extends Component {
  constructor(props) {
    super(props);
  }
  change(type, e) {
    const group = JSON.parse(JSON.stringify(this.props.group));
    switch (type) {
      case 'name':
        group.name = e.target.value;
        break;
      case 'selectExtension':
        const id = e;
        let index = group.appList.indexOf(id);
        if (index === -1) {
          group.appList.push(id);
        } else {
          group.appList.splice(index, 1);
        }
        break;
    }
    sendMessage({ job: 'groupUpdate', group });
  }
  async updateIcon(e) {
    const file = (e.target.files || e.dataTransfer.files)[0];
    let dataURL = await fileToDataURL(file);
    dataURL = await getSquareImg(dataURL);
    const group = this.props.group;
    await promisedSetDB(group.id + '_icon', dataURL);
    sendMessage({ job: 'groupUpdate', group });
  }
  async removeIcon(e) {
    const group = this.props.group;
    await promisedDeleteDB(group.id + '_icon');
    sendMessage({ job: 'groupUpdate', group });
  }
  getIcon(id) {
    let icon;
    const extension = this.props.extensions[id];
    if (!extension) {
      return;
    }
    if (extension.icons && extension.icons.length > 0) {
      icon = extension.icons[extension.icons.length - 1].url;
    } else {
      icon = this.props.icons[id + '_' + extension.version + '_icon'];
    }
    return icon;
  }
  render() {
    const group = this.props.group;
    if (!group) {
      return (
        <GroupDiv>
          <img id='loader' src='/images/icon_128.png' />
        </GroupDiv>
      );
    }
    const selectedList = (group.appList || []).map((id, index) => {
      const extension = this.props.extensions[id];
      if (extension) {
        return (
          <img key={index} title={extension.name} src={this.getIcon(id)} />
        );
      } else {
        this.change('selectExtension', id);
      }
    });
    return (
      <GroupDiv>
        <section>
          <input
            id='name'
            onChange={this.change.bind(this, 'name')}
            // https://github.com/facebook/react/issues/3926
            defaultValue={group.name}
          />
          <input
            type='file'
            onChange={this.updateIcon.bind(this)}
            className='hidden'
            id='groupIconInput'
            accept='image/*'
          />
          <label id='iconHolder' htmlFor='groupIconInput'>
            {this.props.icon ? (
              <img id='icon' src={this.props.icon} />
            ) : (
              <Groupy id='icon' color={shared.themeMainColor} />
            )}
          </label>
          <Closey
            onClick={this.removeIcon.bind(this)}
            id='deleteIcon'
            color={shared.themeMainColor}
          />
          <div id='selectedList'>{selectedList}</div>
          <Selector
            viewMode={this.props.viewMode}
            zoom={0.8}
            actionBar={true}
            icons={this.props.icons}
            extensions={this.props.extensions}
            allGroup={this.props.groupList}
            selectedList={group.appList}
            id={group.id}
            withControl={'group'}
            select={this.change.bind(this, 'selectExtension')}
          />
          <div id='padder' />
        </section>
      </GroupDiv>
    );
  }
}

export default Group;
