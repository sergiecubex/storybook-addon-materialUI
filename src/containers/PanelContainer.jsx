import React from 'react';
import PropTypes from 'prop-types';

import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import * as beauti from 'js-beautify';

import AddonPanel from '../components/AddonPanel';
import withChannel from '../adk/WithChannel';
import {
  EVENT_ID_INIT,
  EVENT_ID_DATA,
  EVENT_ID_BACK,
} from '../config';

const { document, window } = global;
const logger = console;

const lightBaseTheme = createMuiTheme();

const PROGRESS_STATUS = {
  'button-clone': 'soon', // todo: [] button_clone
  'button-download': 'done', // todo: [x] button_download
  'button-clean': 'soon', // todo: [] button_clean
  'textarea-edit': 'done', // todo: [x] textarea-edit
  'textarea-update': 'done' // todo: [x] textarea-update
};

const progressInfo = () => {
  const keys = Object.keys(PROGRESS_STATUS);
  logger.group('PROGRESS_STATUS:');
  keys.forEach(val => {
    if (PROGRESS_STATUS[val] === 'done') {
      logger.info(`${val}: ${PROGRESS_STATUS[val]}`);
      return;
    }
    logger.warn(`${val}: ${PROGRESS_STATUS[val]}`);
  });
  logger.groupEnd('PROGRESS_STATUS:');
};

const genNameList = themesAppliedList =>
  themesAppliedList.map((val, ind) => val.themeName || `Theme ${ind + 1}`);

class PanelContainer extends React.Component {
  static propTypes = {
    store: PropTypes.shape().isRequired,
    api: PropTypes.shape().isRequired
  };

  constructor(props, ...args) {
    super(props, ...args);

    this.state = {
      isReady: false,
      isThemeInvalid: false,
      isThemeEditing: false,
      themeString: '',
      themeInd: 0,
    };
    this.isChannelData = false;

    // future: get from state with own theme ind
    this.muiTheme = lightBaseTheme;
  }

  componentDidMount() {
    // this.props.channel.on(EVENT_ID_INIT, this.onInitChannel);
    // this.props.channel.on(EVENT_ID_DATA, this.onDataChannel);
    this.props.store.connect();
    this.props.store.onData(this.onInitChannel);
  }

  componentDidUpdate() {
    //        if (!this.isChannelData) this.props.channel.emit(EVENT_ID_DATA, nextState);
    this.querySet(this.state);
    this.dataChannelSend(this.state);
    this.isChannelData = false;
  }

  componentWillUnmount() {
    this.props.store.disconnect();
    // this.props.channel.removeListener(EVENT_ID_INIT, this.onInitChannel);
    // this.props.channel.removeListener(EVENT_ID_DATA, this.onDataChannel);
  }

  onInitChannel = initData => {
    // const _themesNameList = genNameList(initData.themesAppliedList);
    const themesNameList = genNameList(initData);
    const queryData = this.queryFetch();
    this.setState({
      themesAppliedList: initData,
      ...queryData,
      themesNameList,
      isReady: true
    });
    console.log('TCL: PanelContainer -> initData', initData);
  };

  onDataChannel = stateData => {
    //        const stateData = JSON.parse(strData);
    const themesNameList = genNameList(stateData.themesAppliedList);
    this.isChannelData = true; // note: this state received by channel, don't need to send back
    this.setState({ ...stateData, themesNameList });
  };

  onThemeSelect = ind => {
    this.setState({
      themeInd: ind
    });
  };

  onChangeTheme = str => {
    // const str = event.target.value;
    try {
      const newTheme = JSON.parse(str);
      const themesAppliedList = this.state.themesAppliedList;
      themesAppliedList[this.state.themeInd] = newTheme;
      this.setState({
        themesAppliedList,
        isThemeInvalid: false,
        themeString: str
      });
    } catch (e) {
      this.setState({
        isThemeInvalid: true,
        themeString: str
      });
    }
  };

  onThemeEditing = isFocus => () => {
    const themeString = this.getCurrentTheme(1);
    this.setState({
      isThemeEditing: isFocus,
      themeString
    });
  };

  onToggleSideBar = f => {
    this.setState({
      isSideBarOpen: f
    });
  };

  onDnLoadTheme = () => {
    const uri = `data:application/json;charset=utf-8;base64,
${window.btoa(this.getCurrentTheme(4))}`;
    const fileName =
      this.state.themesAppliedList[this.state.themeInd].themeFile ||
      'theme.json';
    const downloadTheme = document.createElement('a');
    downloadTheme.href = uri;
    downloadTheme.download = fileName;

    document.body.appendChild(downloadTheme);
    downloadTheme.click();
    document.body.removeChild(downloadTheme);
  };

  onCloneTheme = () => {
    progressInfo(this);
    return null;

    //        const themesAppliedList = this.state.themesAppliedList;
    //        const newTheme = Object.assign({}, themesAppliedList[this.state.themeInd]); // fixme:  deeper
    //        newTheme.themeName = `${themesAppliedList[this.state.themeInd].themeName} clone`;
    //        newTheme.themeFile = `${themesAppliedList[this.state.themeInd].themeFile}.clone`;
    //        const newAppliedList = themesAppliedList.slice(0, this.state.themeInd + 1)
    //            .concat(newTheme, themesAppliedList.slice(this.state.themeInd + 1));
    //        const themesNameList = genNameList(newAppliedList);
    //        logger.log(themesNameList);
    //        this.setState({ themesAppliedList: newAppliedList, themesNameList });
  };

  onCleanTheme = () => {
    progressInfo(this);
    return null;
    //        const themesAppliedList = this.state.themesAppliedList;
    //        const newTheme = {};
    //        newTheme.themeName = themesAppliedList[this.state.themeInd].themeName;
    //        newTheme.themeFile = themesAppliedList[this.state.themeInd].themeFile;
    //        themesAppliedList[this.state.themeInd] = newTheme;
    //        const themesNameList = genNameList(themesAppliedList);
    //        this.setState({ themesAppliedList, themesNameList });
  };

  getCurrentTheme = (indent = 2) =>
    beauti.js_beautify(
      JSON.stringify(this.state.themesAppliedList[this.state.themeInd]),
      {
        indent_size: indent,
        indent_char: ' ',
        eol: '\n',
        end_with_newline: true
      }
    );

  dataChannelSend = data => {
    if (this.isChannelData) return false;
    // this.props.channel.emit(EVENT_ID_BACK, data);
    try {
      const theme = this.state.themesRenderedList[this.state.themeInd];
      this.props.store.send(theme);
      return true;
    } catch (err) {
      return false;
    }
  };

  queryFetch = () => {
    const themeInd = this.props.api.getQueryParam('theme-ind');
    const isSideBarOpen = this.props.api.getQueryParam('theme-sidebar');
    const isFullTheme = this.props.api.getQueryParam('theme-full');
    const data = JSON.parse(
      JSON.stringify({ themeInd, isSideBarOpen, isFullTheme })
    );
    const keys = Object.keys(data);
    keys.forEach(val => {
      data[val] = JSON.parse(data[val]);
    });
    return data;
  };

  querySet = state => {
    if (state.isReady) {
      const { themeInd, isSideBarOpen, isFullTheme } = state;
      const queryParams = {
        'theme-ind': themeInd,
        'theme-sidebar': isSideBarOpen,
        'theme-full': isFullTheme
      };
      this.props.api.setQueryParams(queryParams);
    }
  };

  render() {
    return this.state.isReady ? (
      <MuiThemeProvider theme={this.muiTheme}>
        <AddonPanel
          themesNameList={this.state.themesNameList}
          defautThemeInd={this.state.themeInd}
          isSideBarOpen={this.state.isSideBarOpen}
          onThemeSelect={this.onThemeSelect}
          onToggleSideBar={this.onToggleSideBar}
          themeJSON={
            this.state.isThemeInvalid || this.state.isThemeEditing
              ? this.state.themeString
              : this.getCurrentTheme(1)
          }
          isThemeInvalid={this.state.isThemeInvalid}
          onThemeEditing={this.onThemeEditing}
          onChangeTheme={this.onChangeTheme}
          onDnLoadTheme={this.onDnLoadTheme}
          onCloneTheme={this.onCloneTheme}
          onCleanTheme={this.onCleanTheme}
        />
      </MuiThemeProvider>
    ) : (
      <div
        style={{
          padding: 16,
          fontFamily:
            '"San Francisco", Roboto, "Segoe UI", "Helvetica Neue", "Lucida Grande", sans-serif',
          color: 'rgb(68, 68, 68)'
        }}
      >
        waiting for muiTheme decorator...
      </div>
    );
  }
}

export default withChannel({EVENT_ID_INIT, EVENT_ID_DATA, EVENT_ID_BACK})(PanelContainer)