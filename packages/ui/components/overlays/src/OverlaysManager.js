/**
 * @typedef {import('lit').CSSResult} CSSResult
 * @typedef {import('./OverlayController.js').OverlayController} OverlayController
 */

import { globalOverlaysStyle } from './globalOverlaysStyle.js';
import { setSiblingsInert, unsetSiblingsInert } from './utils/inert-siblings.js';

// Export this as protected var, so that we can easily mock it in tests
// TODO: combine with browserDetection of core?
export const _browserDetection = {
  isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
  isMacSafari:
    navigator.vendor &&
    navigator.vendor.indexOf('Apple') > -1 &&
    navigator.userAgent &&
    navigator.userAgent.indexOf('CriOS') === -1 &&
    navigator.userAgent.indexOf('FxiOS') === -1 &&
    navigator.appVersion.indexOf('Mac') !== -1,
};

/**
 * `OverlaysManager` which manages overlays which are rendered into the body
 */
export class OverlaysManager {
  static __createGlobalRootNode() {
    const rootNode = document.createElement('div');
    rootNode.classList.add('global-overlays');
    document.body.appendChild(rootNode);
    return rootNode;
  }

  static __createGlobalStyleNode() {
    const styleTag = document.createElement('style');
    styleTag.setAttribute('data-global-overlays', '');
    styleTag.textContent = /** @type {CSSResult} */ (globalOverlaysStyle).cssText;
    document.head.appendChild(styleTag);
    return styleTag;
  }

  /**
   * no setter as .list is intended to be read-only
   * You can use .add or .remove to modify it
   */
  // eslint-disable-next-line class-methods-use-this
  get globalRootNode() {
    if (!OverlaysManager.__globalRootNode) {
      OverlaysManager.__globalRootNode = OverlaysManager.__createGlobalRootNode();
      OverlaysManager.__globalStyleNode = OverlaysManager.__createGlobalStyleNode();
    }
    return OverlaysManager.__globalRootNode;
  }

  /**
   * no setter as .list is intended to be read-only
   * You can use .add or .remove to modify it
   */
  get list() {
    return this.__list;
  }

  /**
   * no setter as .shownList is intended to be read-only
   * You can use .show or .hide on individual controllers to modify
   */
  get shownList() {
    return this.__shownList;
  }

  constructor() {
    /**
     * @type {OverlayController[]}
     * @private
     */
    this.__list = [];
    /**
     * @type {OverlayController[]}
     * @private
     */
    this.__shownList = [];
    /** @private */
    this.__siblingsInert = false;
    /**
     * @type {WeakMap<OverlayController, OverlayController[]>}
     * @private
     */
    this.__blockingMap = new WeakMap();
  }

  /**
   * Registers an overlay controller.
   * @param {OverlayController} ctrlToAdd controller of the newly added overlay
   * @returns {OverlayController} same controller after adding to the manager
   */
  add(ctrlToAdd) {
    if (this.list.find(ctrl => ctrlToAdd === ctrl)) {
      throw new Error('controller instance is already added');
    }
    this.list.push(ctrlToAdd);
    return ctrlToAdd;
  }

  /**
   * @param {OverlayController} ctrlToRemove
   */
  remove(ctrlToRemove) {
    if (!this.list.find(ctrl => ctrlToRemove === ctrl)) {
      throw new Error('could not find controller to remove');
    }
    this.__list = this.list.filter(ctrl => ctrl !== ctrlToRemove);
  }

  /**
   * @param {OverlayController} ctrlToShow
   */
  show(ctrlToShow) {
    if (this.list.find(ctrl => ctrlToShow === ctrl)) {
      this.hide(ctrlToShow);
    }
    this.__shownList.unshift(ctrlToShow);

    // make sure latest shown ctrl is visible
    Array.from(this.__shownList)
      .reverse()
      .forEach((ctrl, i) => {
        // eslint-disable-next-line no-param-reassign
        ctrl.elevation = i + 1;
      });
  }

  /**
   * @param {any} ctrlToHide
   */
  hide(ctrlToHide) {
    if (!this.list.find(ctrl => ctrlToHide === ctrl)) {
      throw new Error('could not find controller to hide');
    }
    this.__shownList = this.shownList.filter(ctrl => ctrl !== ctrlToHide);
  }

  teardown() {
    this.list.forEach(ctrl => {
      ctrl.teardown();
    });

    this.__list = [];
    this.__shownList = [];
    this.__siblingsInert = false;

    const rootNode = OverlaysManager.__globalRootNode;
    if (rootNode) {
      if (rootNode.parentElement) {
        rootNode.parentElement.removeChild(rootNode);
      }
      OverlaysManager.__globalRootNode = undefined;

      document.head.removeChild(
        /** @type {HTMLStyleElement} */ (OverlaysManager.__globalStyleNode),
      );
      OverlaysManager.__globalStyleNode = undefined;
    }
  }

  /** Features right now only for Global Overlay Manager */

  get siblingsInert() {
    return this.__siblingsInert;
  }

  disableTrapsKeyboardFocusForAll() {
    this.shownList.forEach(ctrl => {
      if (ctrl.trapsKeyboardFocus === true && ctrl.disableTrapsKeyboardFocus) {
        ctrl.disableTrapsKeyboardFocus({ findNewTrap: false });
      }
    });
  }

  /**
   * @param {'local' | 'global' | undefined} placementMode
   */
  informTrapsKeyboardFocusGotEnabled(placementMode) {
    if (this.siblingsInert === false && placementMode === 'global') {
      if (OverlaysManager.__globalRootNode) {
        setSiblingsInert(this.globalRootNode);
      }
      this.__siblingsInert = true;
    }
  }

  /**
   * @param {{ disabledCtrl?:OverlayController, findNewTrap?:boolean }} options
   */
  informTrapsKeyboardFocusGotDisabled({ disabledCtrl, findNewTrap = true } = {}) {
    const next = this.shownList.find(
      ctrl => ctrl !== disabledCtrl && ctrl.trapsKeyboardFocus === true,
    );
    if (next) {
      if (findNewTrap) {
        next.enableTrapsKeyboardFocus();
      }
    } else if (this.siblingsInert === true) {
      if (OverlaysManager.__globalRootNode) {
        unsetSiblingsInert(this.globalRootNode);
      }
      this.__siblingsInert = false;
    }
  }

  /** PreventsScroll */

  // eslint-disable-next-line class-methods-use-this
  requestToPreventScroll() {
    const { isIOS, isMacSafari } = _browserDetection;
    // no check as classList will dedupe it anyways
    document.body.classList.add('global-overlays-scroll-lock');
    if (isIOS || isMacSafari) {
      // iOS and safar for mac have issues with overlays with input fields. This is fixed by applying
      // position: fixed to the body. As a side effect, this will scroll the body to the top.
      document.body.classList.add('global-overlays-scroll-lock-ios-fix');
    }
    if (isIOS) {
      document.documentElement.classList.add('global-overlays-scroll-lock-ios-fix');
    }
  }

  requestToEnableScroll() {
    const { isIOS, isMacSafari } = _browserDetection;
    if (!this.shownList.some(ctrl => ctrl.preventsScroll === true)) {
      document.body.classList.remove('global-overlays-scroll-lock');
      if (isIOS || isMacSafari) {
        document.body.classList.remove('global-overlays-scroll-lock-ios-fix');
      }
      if (isIOS) {
        document.documentElement.classList.remove('global-overlays-scroll-lock-ios-fix');
      }
    }
  }

  /**
   * Blocking
   * @param {OverlayController} blockingCtrl
   */
  requestToShowOnly(blockingCtrl) {
    const controllersToHide = this.shownList.filter(ctrl => ctrl !== blockingCtrl);

    controllersToHide.map(ctrl => ctrl.hide());
    this.__blockingMap.set(blockingCtrl, controllersToHide);
  }

  /**
   * @param {OverlayController} blockingCtrl
   */
  retractRequestToShowOnly(blockingCtrl) {
    if (this.__blockingMap.has(blockingCtrl)) {
      const controllersWhichGotHidden = /** @type {OverlayController[]} */ (
        this.__blockingMap.get(blockingCtrl)
      );
      controllersWhichGotHidden.map(ctrl => ctrl.show());
    }
  }
}
/** @type {HTMLElement | undefined} */
OverlaysManager.__globalRootNode = undefined;
/** @type {HTMLStyleElement | undefined} */
OverlaysManager.__globalStyleNode = undefined;