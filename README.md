# babel-plugin-vue-jsx-modifier

Support template modifiers (.sync, .capture, etc) in JSX

## Overview

In Vue template, we can use some modifiers. See:

* [.sync Modifier](https://vuejs.org/v2/guide/components.html#sync-Modifier)
* [Event Modifiers](https://vuejs.org/v2/guide/events.html#Event-Modifiers)

```html
<my-component :is-active.sync="isActive"> <!-- sync modifier -->
  <div @scroll.passive="onScroll"> <!-- passive modifier -->
    <!-- snip -->
  </div>
</my-component>
```

But they are not supported in JSX. We must write messy JSX-spread instead.

```jsx
<MyComponent
  isActive={this.isActive}
  {...{
    on: {
      "update:isActive": v => {
        this.isActive = v;
      }
    }
  }}
>
  <div
    {...{
      on: { "&click": this.onScroll }
    }}
  />
</MyComponent>
```

By this plugin, we can write equivalent JSX as below:

```jsx
<MyComponent isActive={__sync(this.isActive)}>
  <div onClick={__passive(this.onScroll)} />
</MyComponent>
```

## Install

First, install [babel-plugin-transform-vue-jsx](https://github.com/vuejs/babel-plugin-transform-vue-jsx)

And install this

```
npm install babel-plugin-vue-jsx-modifier -D
```

## Usage

put `"vue-jsx-modifier"` before `"transform-vue-jsx"` in your `.babelrc`:

```json
{
  "presets": ["env"],
  "plugins": ["vue-jsx-modifier", "transform-vue-jsx"]
}
```

Example code for TypeScript:

```typescript
// modifier functions can be imported from "lib/modifiers"
import { __sync } from "babel-plugin-vue-jsx-modifier/lib/modifiers";
import Vue, { VNode } from "vue";
import MyComponent from "./MyComponent.vue";

export default Vue.extend({
  data() {
    return {
      value: "default";
    }
  },
  render(): VNode {
    // Wrap member expression by `__sync` where you want use .sync
    return <MyComponent myProp={ __sync(this.value) } />;
  }
});
```

`<MyComponent myProp={ __sync(this.value) }` will be transpiled to:

```jsx
<MyComponent myProp={ this.value } {...{
  on: { "update:myProp": _v0 => {
    this.value = _v0;
  } }
}}>
```

## Modifier functions

These functions are available.

NOTE: They should be removed by babel, and will throw Error if called at runtime.

### Prop modifier

#### `__sync`

Transpile this code

```jsx
// original code
<MyComponent foo={ _sync(this.foo) } />

// transpiled code
<MyComponent foo={ this.foo } {...{
  on: { "update:foo": { _v0 => { this.foo = _v0; } }}
}} />
```

### Event modifiers

These modifiers can be used with event handler.
Transipilation will fail if target JSX attribute name does not start with `on` or `nativeOn`

#### `__capture`

```jsx
// original code
<div onClick={ _capture(this.onClick) } />

// transpiled code
<div {...{
  on: { "!click": this.onClick }
}} />
```

nativeOn is also supported

```jsx
// original code
<MyComponent nativeOnClick={ _capture(this.onClick) } />

// transpiled code
<MyComponent {...{
  nativeOn: { "!click": this.onClick }
}} />
```

#### `__passive`

Same as `__capture`, except for prefix (`&`)

```jsx
// original code
<div onScroll={ _passive(this.onScroll) } />

// transpiled code
<div {...{
  on: { "&scroll": this.onScroll }
}} />
```

#### `__once`

Same as `__capture`, except for prefix (`~`)

#### `__captureOnce`

Same as `__capture`, except for prefix (`~!`)
