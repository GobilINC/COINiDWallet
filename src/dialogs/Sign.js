import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Alert, View } from 'react-native';
import Big from 'big.js';

import {
  Text,
  BatchList,
  RowInfo,
  FeeSlider,
  DetailsModal,
  COINiDTransport,
  Button,
  CancelButton,
} from '../components';

import { numFormat } from '../utils/numFormat';

import { colors, fontWeight } from '../config/styling';
import styleMerge from '../utils/styleMerge';
import parentStyles from './styles/common';

import WalletContext from '../contexts/WalletContext';

const styles = styleMerge(
  parentStyles('light'),
  StyleSheet.create({
    summaryContainer: {
      width: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      zIndex: 100,
      position: 'relative',
      marginBottom: -16,
      paddingBottom: 16,
    },
    batchedHeaderContainer: {
      marginTop: -16,
      paddingTop: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      width: '100%',
      zIndex: 100,
      position: 'relative',
    },
    batchedHeader: {
      color: colors.getTheme('light').fadedText,
      marginBottom: 8,
      ...fontWeight.medium,
    },
  }),
);

class Sign extends Component {
  static contextType = WalletContext;

  static propTypes = {
    payments: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    balance: PropTypes.number.isRequired,
    navigation: PropTypes.shape({}).isRequired,
    dialogRef: PropTypes.shape({}).isRequired,
  };

  constructor(props, context) {
    super(props);

    this.fee = 0;
    const { ticker } = context.coinid;

    this.state = {
      total: 0,
      subTotal: 0,
      fee: this.fee,
      ticker,
    };
  }

  componentDidMount() {
    this._calculateTotal();
  }

  componentWillReceiveProps() {
    this._calculateTotal();
  }

  shouldComponentUpdate() {
    if (this.forceNoRender) {
      return false;
    }
    return true;
  }

  _calculateTotal = () => {
    const { payments } = this.props;
    const { fee } = this;

    let subTotal = payments.reduce((a, c) => a.plus(c.amount), Big(0));
    const total = Number(subTotal.plus(fee));
    subTotal = Number(subTotal);

    this.setState({
      total,
      subTotal,
      fee,
    });
  };

  _verify = () => {
    let { total } = this.state;
    total = Number(total);

    const { payments, balance } = this.props;
    const errors = [];

    if (!payments.length) {
      errors.push({
        type: 'payments',
        message: 'no payments...',
      });
    }

    if (isNaN(total)) {
      errors.push({
        type: 'amount',
        message: 'amount is not a number',
      });
    }

    if (total === Number(0)) {
      errors.push({
        type: 'amount',
        message: 'amount cannot be zero',
      });
    }

    if (total > balance) {
      errors.push({
        type: 'balance',
        message: 'not enough funds',
      });
    }

    if (errors.length) {
      throw errors;
    }

    return true;
  };

  _getTransactionData = () => {
    const { coinid } = this.context;
    const { payments } = this.props;
    const { fee } = this.state;
    const isRBFEnabled = true;

    return new Promise((resolve, reject) => {
      try {
        if (this._verify()) {
          const transactionData = coinid.buildTransactionData(payments, fee, isRBFEnabled);
          const splitData = transactionData.split(':');
          this.savedUnsignedHex = splitData[3];
          return resolve(transactionData);
        }
      } catch (err) {
        Alert.alert(`${err}`);
        return reject(err);
      }
    });
  };

  _setFee = (fee) => {
    this.fee = fee;
    this._calculateTotal();
  };

  _close = () => {
    const { dialogRef } = this.props;
    dialogRef._close();
  };

  _onPressItem = (item) => {
    this._close();

    const { dialogNavigate } = this.context;
    const { navigation, balance } = this.props;

    dialogNavigate(
      'EditTransaction',
      {
        onAddToBatch: this._onAddToBatch,
        onRemoveFromBatch: this._onRemoveFromBatch,
        balance,
        navigation,
        editItem: item,
      },
      this.context,
    );
  };

  _handleReturnData = (data) => {
    const { coinid } = this.context;
    const { payments, onQueuedTx } = this.props;
    const [action, hex] = data.split('/');

    const refresh = () => {
      this.forceNoRender = true;
      onQueuedTx();
    };

    if (action === 'TX' && hex) {
      coinid
        .queueTx(hex, this.savedUnsignedHex)
        .then(queueData => coinid.noteHelper.saveNotes(queueData.tx, payments))
        .then(() => refresh())
        .catch((err) => {
          Alert.alert(`${err}`);
        });
    }
  };

  render() {
    const { subTotal, total, ticker } = this.state;
    const { payments } = this.props;

    const renderTransportContent = ({
      isSigning, signingText, cancel, submit,
    }) => {
      let validationError = [];
      try {
        this._verify();
      } catch (err) {
        validationError = err;
      }

      let disableButton = false;
      if (isSigning || validationError.length) {
        disableButton = true;
      }

      return (
        <View style={styles.modalContent}>
          <View style={styles.batchedHeaderContainer}>
            <Text style={styles.batchedHeader}>Batched Transactions</Text>
          </View>
          <BatchList onPress={this._onPressItem} batchedTxs={payments} disabled={isSigning} />
          <View style={styles.summaryContainer}>
            <View style={{ marginBottom: 24, marginTop: 16 }}>
              <FeeSlider
                onChange={(val) => {
                  this._setFee(val);
                }}
                amount={subTotal}
                batchedTransactions={payments}
                disabled={isSigning}
              />
            </View>

            <RowInfo
              style={[{ marginBottom: 24 }]}
              childStyle={validationError.length ? { color: '#FA503C' } : {}}
              title="Total"
            >
              {`${numFormat(total, ticker)} ${ticker}`}
            </RowInfo>
            <Button
              style={styles.formButton}
              onPress={submit}
              disabled={disableButton}
              isLoading={isSigning}
              loadingText={signingText}
            >
              Sign with COINiD
            </Button>
            <CancelButton show={isSigning} onPress={cancel} marginTop={16}>
              Cancel
            </CancelButton>
          </View>
        </View>
      );
    };

    return (
      <COINiDTransport getData={this._getTransactionData} handleReturnData={this._handleReturnData}>
        {renderTransportContent}
      </COINiDTransport>
    );
  }
}

export default Sign;
