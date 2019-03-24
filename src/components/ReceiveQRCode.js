import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet, View, Platform, TouchableOpacity, PixelRatio, Clipboard,
} from 'react-native';
import { Icon } from 'react-native-elements';
import ViewShot from 'react-native-view-shot';
import QRCode from 'react-native-qrcode-svg';
import { FontScale, Text } from '.';
import { colors, fontSize } from '../config/styling';
import StatusBoxContext from '../contexts/StatusBoxContext';

const styles = StyleSheet.create({
  qrCode: {
    padding: 8,
    backgroundColor: colors.white,
  },
  qrCodeWrapper: {
    marginTop: 4,
    marginBottom: 16,
    height: 160,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addressText: {
    fontSize: fontSize.small,
    textAlign: 'center',
  },
  statusBox: {
    marginHorizontal: 8,
    borderRadius: 8,
    borderColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: colors.purple,
    fontSize: fontSize.small,
  },
});

class ReceiveQRCode extends PureComponent {
  static propTypes = {
    address: PropTypes.string,
    qrAddress: PropTypes.string,
    getViewShot: PropTypes.func,
  };

  static defaultProps = {
    address: '',
    qrAddress: '',
    getViewShot: () => {},
  };

  constructor() {
    super();

    this.state = {
      disableCopy: false,
    };
  }

  _copyAddress = ({ showStatus }) => {
    const { address } = this.props;
    Clipboard.setString(address);

    showStatus('Copied to clipboard');
  };

  _renderContent = ({ showStatus }) => {
    const { disableCopy } = this.state;
    const { getViewShot, qrAddress, address } = this.props;

    return (
      <>
        <View style={styles.qrCodeWrapper}>
          <TouchableOpacity
            onPress={() => this._copyAddress({ showStatus })}
            disabled={disableCopy}
          >
            <ViewShot
              ref={getViewShot}
              options={{
                format: 'png',
                result: Platform.OS === 'ios' ? 'tmpfile' : 'data-uri',
                width: parseInt(320 / PixelRatio.get(), 10),
                height: parseInt(320 / PixelRatio.get(), 10),
              }}
            >
              <View style={styles.qrCode}>
                <QRCode value={qrAddress} size={160} ecl="Q" />
              </View>
            </ViewShot>
          </TouchableOpacity>
        </View>

        <FontScale fontSizeMax={fontSize.small} fontSizeMin={8} text={address} widthScale={0.9}>
          {({ fontSize: scaledFontSize }) => (
            <Text style={[styles.addressText, { fontSize: scaledFontSize }]} selectable>
              {address}
            </Text>
          )}
        </FontScale>
      </>
    );
  };

  render() {
    return (
      <React.Fragment>
        <StatusBoxContext.Consumer>{this._renderContent}</StatusBoxContext.Consumer>
      </React.Fragment>
    );
  }
}

export default ReceiveQRCode;
