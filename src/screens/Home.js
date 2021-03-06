import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  Animated, Dimensions, View, Platform, StyleSheet, StatusBar,
} from 'react-native';
import { Header, Icon } from 'react-native-elements';

import Carousel, { Pagination } from 'react-native-snap-carousel';
import LottieView from 'lottie-react-native';
import { colors, fontWeight } from '../config/styling';
import projectSettings from '../config/settings';

import { Text } from '../components';
import { Wallet } from '.';
import DialogBoxContext from '../contexts/DialogBoxContext';
import COINiDPublic from '../libs/coinid-public';
import storageHelper from '../utils/storageHelper';

import settingHelper from '../utils/settingHelper';

const sliderWidth = Dimensions.get('window').width;

const lottieFiles = {
  walletLogo: require('../animations/wallet_logo.json'),
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.black,
    zIndex: 1000,
    opacity: 0,
  },
  headerOuter: {
    flex: 1,
    borderBottomWidth: 0,
    height: 40,
    marginTop: 0,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 16,
  },
  headerInner: {},
  headerSideContainer: {
    flexDirection: 'row',
    height: '100%',
    position: 'absolute',
    top: -40,
  },
  title: {
    fontSize: 17,
    lineHeight: 20,
    marginBottom: 2,
  },
  logo: {
    marginLeft: 10,
    fontSize: 24,
    color: colors.white,
  },
  settingsBtn: {
    fontSize: 24,
    color: colors.white,
  },
  settingsBtnContainer: {
    alignSelf: 'center',
  },
  dotStyle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotContainerStyle: {
    marginHorizontal: 3,
  },
  paginationContainerStyle: {
    paddingBottom: 0,
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  paginator: {
    marginBottom: 3,
  },
  testnetText: {
    color: colors.white,
    fontSize: 11,
    ...fontWeight.book,
    marginLeft: 4,
    alignSelf: 'center',
  },
});

class Home extends PureComponent {
  constructor(props) {
    super(props);

    this.walletComponents = [];
    this.settingHelper = settingHelper(projectSettings.coin);

    const { navigation } = this.props;
    navigation.setParams({ setScreenAnimator: this._setScreenAnimator });

    this.hotCOINiD = COINiDPublic(
      projectSettings.coin,
      storageHelper(`${projectSettings.coin}-hot`),
      `${projectSettings.coin}-hot`,
    );

    this.coldCOINiD = COINiDPublic(
      projectSettings.coin,
      storageHelper(`${projectSettings.coin}-cold`),
      `${projectSettings.coin}-cold`,
    );

    global.unlockCOINiD = this.hotCOINiD;
    global._hideSensitive = this._hideSensitive;
    global._showSensitive = this._showSensitive;

    const slides = [
      {
        coinid: this.hotCOINiD,
        type: 'hot',
        title: 'Hot',
        theme: 'light',
        dotColor: colors.getHot(),
        settingHelper: this.settingHelper,
        snapTo: () => {
          this._snapToItem(0);
        },
        openSignMessage: () => {
          this._openSignMessage(0);
        },
        openVerifyMessage: () => {
          this._openVerifyMessage(0);
        },
      },
      {
        coinid: this.coldCOINiD,
        type: 'cold',
        title: 'Cold',
        theme: 'dark',
        dotColor: colors.getCold(),
        settingHelper: this.settingHelper,
        snapTo: () => {
          this._snapToItem(1);
        },
        openSignMessage: () => {
          this._openSignMessage(1);
        },
        openVerifyMessage: () => {
          this._openVerifyMessage(1);
        },
      },
    ];

    this.state = {
      activeSlide: 0,
      slides,
      hideSensitive: false,
      walletTitle: `${slides[0].title} Wallet`,
    };
  }

  get _carousel() {
    const { slides, activeSlide } = this.state;

    return (
      <Carousel
        ref={(c) => {
          this.carusel = c;
        }}
        layout="default"
        data={slides}
        renderItem={this._renderItem}
        sliderWidth={sliderWidth}
        itemWidth={sliderWidth}
        onSnapToItem={this._onSnapToItem}
        inactiveSlideOpacity={Platform.OS === 'ios' ? 0.7 : 1}
        firstItem={activeSlide}
        containerCustomStyle={{ overflow: 'visible' }}
        testID="carousel"
      />
    );
  }

  get _pagination() {
    const { activeSlide, walletTitle, slides } = this.state;
    const dotColorByIndex = slides.map(a => a.dotColor);
    return (
      <View style={{ height: '100%', justifyContent: 'center' }}>
        <Text style={styles.title}>{walletTitle}</Text>
        <View style={styles.paginator}>
          <Pagination
            ref={(c) => {
              this.pagination = c;
            }}
            dotsLength={slides.length}
            activeDotIndex={activeSlide}
            containerStyle={styles.paginationContainerStyle}
            dotContainerStyle={styles.dotContainerStyle}
            dotStyle={styles.dotStyle}
            inactiveDotStyle={styles.inactiveDotStyle}
            inactiveDotScale={1}
            inactiveDotOpacity={1}
            dotColor={colors.lightGray}
            inactiveDotColor={colors.gray}
            dotColorByIndex={dotColorByIndex}
          />
        </View>
      </View>
    );
  }

  _setScreenAnimator = ({ position, layout }) => {
    if (!this.screenLayout && layout.isMeasured) {
      this.screenLayout = layout;
    }

    if (!this.headerAnimStyle) {
      this.screenAnimator = position;

      this.headerAnimStyle = {
        opacity: position.interpolate({
          inputRange: [0.2, 0.5, 1],
          outputRange: [1, 0, 0],
        }),
      };
    }

    if (!this.overlayAnimStyle) {
      this.overlayAnimStyle = {
        opacity: position.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0, 0, 0.4],
        }),
      };
    }
  };

  _updateActiveTitle = (index) => {
    const { slides } = this.state;
    this.setState({ walletTitle: `${slides[index].title} Wallet` });
  };

  _renderItem = ({ item, index }) => {
    const { navigation } = this.props;
    const { slides, hideSensitive } = this.state;

    return (
      <View style={{ flex: 1, width: sliderWidth }} testID={`wallet-${slides[index].type}`}>
        <Wallet
          ref={(c) => {
            this.walletComponents[index] = c;
          }}
          {...item}
          navigation={navigation}
          onBuild={() => this._onWalletBuild(index)}
          onBuildReady={() => this._onWalletBuildReady(index)}
          hideSensitive={hideSensitive}
        />
      </View>
    );
  };

  _hideSensitive = () => {
    this.setState({
      hideSensitive: true,
    });
  };

  _showSensitive = () => {
    this.setState({
      hideSensitive: false,
    });
  };

  _openSignMessage = (index) => {
    if (this.walletComponents[index] && this.walletComponents[index]._openSignMessage) {
      this.walletComponents[index]._openSignMessage();
    }
  };

  _openVerifyMessage = (index) => {
    if (this.walletComponents[index] && this.walletComponents[index]._openVerifyMessage) {
      this.walletComponents[index]._openVerifyMessage();
    }
  };

  _onSnapToItem = (index) => {
    this.pagination.setActiveDotIndex(index);
    this._updateActiveTitle(index);

    if (index !== this.prevIndex) {
      if (this.walletComponents[index] && this.walletComponents[index]._onSnapTo) {
        this.walletComponents[index]._onSnapTo();
      }

      if (this.prevIndex !== undefined) {
        if (
          this.walletComponents[this.prevIndex]
          && this.walletComponents[this.prevIndex]._onSnapFrom
        ) {
          this.walletComponents[this.prevIndex]._onSnapFrom();
        }
      }
      this.prevIndex = index;
    }
  };

  _snapToItem = (index) => {
    this.carusel.snapToItem(index);
  };

  _onWalletReset = (index) => {
    this.walletComponents[index]._checkAccount();
    this.carusel.snapToItem(index);
  };

  _onWalletBuild = (index) => {
    global.disableInactiveOverlay();
    this.carusel._setScrollEnabled(false);
    this.carusel.snapToItem(index);
  };

  _onWalletBuildReady = (index) => {
    global.enableInactiveOverlay();
    this.carusel._setScrollEnabled(true);
    this.carusel.snapToItem(index);
  };

  _openSettings = () => {
    const { navigation } = this.props;
    const { navigate } = navigation;
    const { slides } = this.state;

    navigate('Settings', {
      slides,
      onWalletReset: this._onWalletReset,
      screenAnimator: this.screenAnimator,
      screenLayout: this.screenLayout,
    });
  };

  _renderHeaderLeft = () => {
    const renderTestnet = () => {
      if (projectSettings.isTestnet) {
        return <Text style={styles.testnetText}>Testnet version</Text>;
      }

      return null;
    };

    return (
      <View style={[styles.headerSideContainer]}>
        <LottieView
          style={{ width: 24, height: 24, alignSelf: 'center' }}
          source={lottieFiles.walletLogo}
        />
        {renderTestnet()}
      </View>
    );
  };

  _renderHeaderRight = () => (
    <View style={[styles.headerSideContainer, { alignSelf: 'flex-end' }]}>
      <Icon
        name="settings"
        containerStyle={styles.settingsBtnContainer}
        iconStyle={styles.settingsBtn}
        underlayColor="transparent"
        onPress={this._openSettings}
        testID="button-settings"
      />
    </View>
  );

  render() {
    return (
      <DialogBoxContext.Provider>
        <View style={{ flex: 1 }}>
          <View style={styles.container}>
            <Animated.View style={[{ height: 40 }, this.headerAnimStyle]}>
              <Header
                outerContainerStyles={styles.headerOuter}
                innerContainerStyles={styles.headerInner}
                leftComponent={this._renderHeaderLeft()}
                centerComponent={this._pagination}
                rightComponent={this._renderHeaderRight()}
              />
            </Animated.View>
            {this._carousel}
          </View>
          <Animated.View pointerEvents="none" style={[styles.overlay, this.overlayAnimStyle]} />
        </View>
      </DialogBoxContext.Provider>
    );
  }
}

Home.propTypes = {
  navigation: PropTypes.shape({}).isRequired,
};

export default Home;
