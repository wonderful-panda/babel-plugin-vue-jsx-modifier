[![Build Status](https://travis-ci.org/wonderful-panda/babel-plugin-vue-jsx-modifier.svg?branch=master)](https://travis-ci.org/wonderful-panda/babel-plugin-vue-jsx-modifier)

# babel-plugin-vue-jsx-modifier

Support template modifiers (.sync, .capture, etc) in JSX

## Overview

In Vue template, we can use some modifiers. See:

- [.sync Modifier](https://vuejs.org/v2/guide/components.html#sync-Modifier)
- [Event Modifiers](https://vuejs.org/v2/guide/events.html#Event-Modifiers)

```html
<my-component :is-active.sync="isActive">
  <!-- sync modifier -->
  <div @scroll.passive="onScroll">
    <!-- passive modifier -->
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

First, setup Vue environment and enable JSX transpilation (see https://github.com/vuejs/jsx).

And install this

```
npm install babel-plugin-vue-jsx-modifier -D
```

## Usage

add `"vue-jsx-modifier"` to "plugins" in your `.babelrc`.

```json
{
  "presets": ["@vue/babel-preset-jsx"],
  "plugins": ["vue-jsx-modifier"]
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

#### \_\_sync

Insert handler which listens update event from child

```jsx
// original code
<MyComponent foo={ __sync(this.foo) } />

// transpiled code
<MyComponent foo={ this.foo } {...{
  on: { "update:foo": { _v0 => { this.foo = _v0; } }}
}} />
```

You can specify setter code as second argument.

```jsx
// original code
<MyComponent foo={ __sync(store.state.foo, v => store.commit("setFoo", v)) } />

// transpiled code
<MyComponent foo={ store.state.foo } {...{
  on: { "update:foo": v => store.commit("setFoo", v) }
}} />
```

#### \_\_relay

Similar to `__sync`, and re-emit update event to parent instead of direct assignment.

```jsx
// original code
<MyComponent foo={ __relay(this.fooValue) } />

// transpiled code
<MyComponent foo={ this.fooValue } {...{
  on: { "update:foo": { _v0 => { this.$emit("update:fooValue", _v0); } }}
}} />
```

You can specify `emit` method as second argument if you want to use method other than `this.$emit`.
This is useful when using with `@vue/composition-api`

```jsx
// original code
<MyComponent foo={ __relay(this.fooValue, ctx.emit) } />

// transpiled code
<MyComponent foo={ this.fooValue } {...{
  on: { "update:foo": { _v0 => { ctx.emit("update:fooValue", _v0); } }}
}} />
```

### Event modifiers

These modifiers can be used with event handler.
Transipilation will fail if target JSX attribute name does not start with `on` or `nativeOn`

#### \_\_capture

```jsx
// original code
<div onClick={ __capture(this.onClick) } />

// transpiled code
<div {...{
  on: { "!click": this.onClick }
}} />
```

nativeOn is also supported

```jsx
// original code
<MyComponent nativeOnClick={ __capture(this.onClick) } />

// transpiled code
<MyComponent {...{
  nativeOn: { "!click": this.onClick }
}} />
```

#### \_\_passive

Same as `__capture`, except for prefix (`&`)

```jsx
// original code
<div onScroll={ __passive(this.onScroll) } />

// transpiled code
<div {...{
  on: { "&scroll": this.onScroll }
}} />
```

#### \_\_once

Same as `__capture`, except for prefix (`~`)

#### \_\_captureOnce

Same as `__capture`, except for prefix (`~!`)

## Miscellaneous

### Why don't use existing plugins?

There are similar projects.

- [babel-plugin-jsx-event-modifiers](https://github.com/nickmessing/babel-plugin-jsx-event-modifiers)
- [babel-plugin-vue-jsx-sync](https://github.com/njleonzhang/babel-plugin-vue-jsx-sync)

I uses TypeScript, and try to make Vue+JSX more typesafe by [vue-tsx-support](https://github.com/wonderful-panda/vue-tsx-support).

`babel-plugin-jsx-event-modifiers` uses JSX namespaced attribute (like `onKeyup:up`),  
but TypeScript does not support it.

When using `babel-plugin-vue-jsx-sync`, we must specify different attribute name from original definition
(e.g. `visible$sync` for `visible`),  
but it will break type check provided by `vue-tsx-support`.
(`"visible must be boolean"`, `"visible must be specified"`, etc)

These are the reason why I wrote another plugin.

### Other modifiers?

Some other modifiers (`.stop`, `.prevent`, `.enter`, ...) are available in [vue-tsx-support](https://github.com/wonderful-panda/vue-tsx-support).
