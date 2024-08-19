# Dialog >> Use Cases ||20

`lion-dialog` is a component wrapping a modal dialog controller.
Its purpose is to make it easy to use our Overlay System declaratively.

```js script
import { html } from '@mdjs/mdjs-preview';
import '@lion/ui/define/lion-dialog.js';

import { demoStyle } from './src/demoStyle.js';
import './src/styled-dialog-content.js';
import './src/slots-dialog-content.js';
```

```html
<lion-dialog>
  <div slot="content">
    This is a dialog
    <button @click=${e => e.target.dispatchEvent(new Event('close-overlay', { bubbles: true }))}>x</button>
  <div>
  <button slot="invoker">Click me</button>
</lion-dialog>
```

## Trigger Dialog Externally

```js script
import { LitElement, html } from 'lit';
import { LionDialog } from '@lion/ui/dialog.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

class DialogDemo extends ScopedElementsMixin(LitElement) {
  static properties = {
    isOpen: { type: Boolean, state: true },
  };

  static scopedElements = {
    'lion-dialog': LionDialog,
  };

  openDialog() {
    console.log('opened called');
    this.isOpen = true;
  }

  handleClose() {
    console.log('close called');
    this.isOpen = false;
  }

  render() {
    return html`
      <h1>Hello DialogDemo</h1>
      <button @click=${this.openDialog}>Open dialog</button>
      <lion-dialog ?opened=${this.isOpen}>
        <div slot="content" class="demo-dialog-content">
          Hello! You can close this dialog here:
          <button class="demo-dialog-content__close-button" @click=${this.handleClose}>⨯</button>
        </div>
      </lion-dialog>
    `;
  }
}

customElements.define('dilaog-demo', DialogDemo);
```

```js preview-story
export const triggerDialogExternally = () => {
  return html`
    <style>
      ${demoStyle}
    </style>
    <div class="demo-box_placements">
      <dilaog-demo></dilaog-demo>
    </div>
  `;
};
```

## Placement overrides

```js preview-story
export const placementOverrides = () => {
  const dialog = placement => {
    const cfg = { viewportConfig: { placement } };
    return html`
      <lion-dialog .config="${cfg}">
        <button slot="invoker">Dialog ${placement}</button>
        <div slot="content" class="dialog demo-box">
          Hello! You can close this notification here:
          <button
            class="close-button"
            @click=${e => e.target.dispatchEvent(new Event('close-overlay', { bubbles: true }))}
          >
            ⨯
          </button>
        </div>
      </lion-dialog>
    `;
  };
  return html`
    <style>
      ${demoStyle}
    </style>
    <div class="demo-box_placements">
      ${dialog('center')} ${dialog('top-left')} ${dialog('top-right')} ${dialog('bottom-left')}
      ${dialog('bottom-right')}
    </div>
  `;
};
```

Configuration passed to `config` property:

```js
{
  viewportConfig: {
    placement: ... // <-- choose a position
  }
}
```

## Other overrides

No backdrop, hides on escape, prevents scrolling while opened, and focuses the body when hiding.

```js preview-story
export const otherOverrides = () => {
  const cfg = {
    hasBackdrop: false,
    hidesOnEscape: true,
    preventsScroll: true,
    elementToFocusAfterHide: document.body,
  };

  return html`
    <style>
      ${demoStyle}
    </style>
    <lion-dialog .config="${cfg}">
      <button slot="invoker">Click me to open dialog</button>
      <div slot="content" class="demo-dialog-content">
        Hello! You can close this dialog here:
        <button
          class="demo-dialog-content__close-button"
          @click=${e => e.target.dispatchEvent(new Event('close-overlay', { bubbles: true }))}
        >
          ⨯
        </button>
      </div>
    </lion-dialog>
  `;
};
```

Configuration passed to `config` property:

```js
{
  hasBackdrop: false,
  hidesOnEscape: true,
  preventsScroll: true,
  elementToFocusAfterHide: document.body
}
```
