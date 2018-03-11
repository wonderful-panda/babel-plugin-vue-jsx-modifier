import * as babel from "babel-core";
import plugin from "../..";

const plugins = [plugin];

describe("__sync", () => {
  it("basic functionary", () => {
    const { code } = babel.transform(
      `<MyComponent foo={ __sync(state.fooValue) } />`,
      { plugins }
    );
    expect(code).toMatchSnapshot();
  });

  it("object name of __sync method is just ignored", () => {
    const { code } = babel.transform(
      `<MyComponent foo={ xxx.__sync(state.fooValue) } />`,
      { plugins }
    );
    expect(code).toMatchSnapshot();
  });

  it("works for deep member expression", () => {
    const { code } = babel.transform(
      `<MyComponent foo={ __sync(state.foo.bar.baz) } />`,
      { plugins }
    );
    expect(code).toMatchSnapshot();
  });

  it("update handlers of multiple sync props are in same object", () => {
    const { code } = babel.transform(
      `<MyComponent foo={ __sync(state.fooValue) } bar={ __sync(state.barValue) } />`,
      { plugins }
    );
    expect(code).toMatchSnapshot();
  });

  it("update handler of kebab-case prop should be camelCase", () => {
    const { code } = babel.transform(
      `<MyComponent foo-bar-baz={ __sync(state.value ) } />`,
      { plugins }
    );
    expect(code).toMatch(/\"update:fooBarBaz\":/);
  });

  it("Throw error if sprecified in event handler", () => {
    expect(() => {
      babel.transform(`<div onClick={ __sync(this.onClick) } />`, { plugins });
    }).toThrow(/only in component prop/);

    expect(() => {
      babel.transform(
        `<MyComponent nativeOnClick={ __sync(this.onClick) } />`,
        { plugins }
      );
    }).toThrow(/only in component prop/);
  });

  it("Throw error if argument is not MemberExpression", () => {
    expect(() => {
      babel.transform(`<div foo={ __sync(data) } />`, { plugins });
    }).toThrow(/must be MemberExpression/);
  });
});

describe("__capture", () => {
  it("basic functionary", () => {
    const { code } = babel.transform(
      `<MyComponent nativeOnScroll={ __capture(this.onScrollCapture) } />`,
      { plugins }
    );
    expect(code).toMatchSnapshot();
  });

  it("Throw error if sprecified in other than event handler", () => {
    expect(() => {
      babel.transform(`<div foo={ __capture(this.onClick) } />`, { plugins });
    }).toThrow(/only in event handler/);

    expect(() => {
      babel.transform(
        `<MyComponent nativeOnClick={ __sync(this.onClick) } />`,
        { plugins }
      );
    }).toThrow(/only in component prop/);
  });
});
