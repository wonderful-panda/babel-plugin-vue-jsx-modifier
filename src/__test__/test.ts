import * as babel from "@babel/core";
import plugin from "../..";

function transform(code: string): string | undefined {
  const opts: babel.TransformOptions = {
    plugins: [plugin]
  };
  const ret = babel.transform(code, opts);
  return ret ? ret.code || undefined : undefined;
}

describe("__sync", () => {
  it("basic functionary", () => {
    const code = transform(`<MyComponent foo={ __sync(state.fooValue) } />`);
    expect(code).toMatchSnapshot();
  });

  it("object name of __sync method is just ignored", () => {
    const code = transform(
      `<MyComponent foo={ xxx.__sync(state.fooValue) } />`
    );
    expect(code).toMatchSnapshot();
  });

  it("works for deep member expression", () => {
    const code = transform(`<MyComponent foo={ __sync(state.foo.bar.baz) } />`);
    expect(code).toMatchSnapshot();
  });

  it("works for literal member expression", () => {
    const code = transform(`<MyComponent foo={ __sync(state['foo-key']) } />`);
    expect(code).toMatchSnapshot();
  });

  it("update handlers of multiple sync props are in same object", () => {
    const code = transform(
      `<MyComponent foo={ __sync(state.fooValue) } bar={ __sync(state.barValue) } />`
    );
    expect(code).toMatchSnapshot();
  });

  it("avoid using argument name which shadows existing variables", () => {
    const code = transform(
      `const _v0 = <MyComponent foo={ __sync(state.fooValue) } bar={ __sync(state.barValue) } />;`
    );
    expect(code).toMatchSnapshot();
  });

  it("update handler of kebab-case prop should be camelCase", () => {
    const code = transform(
      `<MyComponent foo-bar-baz={ __sync(state.value ) } />`
    );
    expect(code).toMatch(/"update:fooBarBaz":/);
  });

  it("Throw error if sprecified in event handler", () => {
    expect(() => {
      transform(`<div onClick={ __sync(this.onClick) } />`);
    }).toThrow(/only in component prop/);

    expect(() => {
      transform(`<MyComponent nativeOnClick={ __sync(this.onClick) } />`);
    }).toThrow(/only in component prop/);
  });

  it("Throw error if argument is not MemberExpression", () => {
    expect(() => {
      transform(`<div foo={ __sync(data) } />`);
    }).toThrow(/must be MemberExpression/);
  });
});

describe("__relay", () => {
  it("basic functionary", () => {
    const code = transform(`<MyComponent foo={ __relay(this.fooValue) } />`);
    expect(code).toMatchSnapshot();
  });

  it("works for literal MemberExpression", () => {
    const code = transform(`<MyComponent foo={ __relay(this['foo-key']) } />`);
    expect(code).toMatchSnapshot();
  });

  it("works for computed MemberExpression", () => {
    const code = transform(`<MyComponent foo={ __relay(this[fooKey]) } />`);
    expect(code).toMatchSnapshot();
  });

  it("update handlers of multiple sync/relay props are in same object", () => {
    const code = transform(
      `<MyComponent foo={ __sync(this.fooValue) } bar={ __relay(this.barValue) } />`
    );
    expect(code).toMatchSnapshot();
  });

  it("Throw error if sprecified in event handler", () => {
    expect(() => {
      transform(`<div onClick={ __relay(this.onClick) } />`);
    }).toThrow(/only in component prop/);

    expect(() => {
      transform(`<MyComponent nativeOnClick={ __relay(this.onClick) } />`);
    }).toThrow(/only in component prop/);
  });

  it("Throw error if argument is not MemberExpression", () => {
    expect(() => {
      transform(`<div foo={ __relay(data) } />`);
    }).toThrow(/must be MemberExpression/);
  });
});

describe("__capture", () => {
  it("basic functionary (on)", () => {
    const code = transform(
      `<div onScroll={ __capture(this.onScrollCapture) } />`
    );
    expect(code).toMatchSnapshot();
  });

  it("basic functionary (nativeOn)", () => {
    const code = transform(
      `<MyComponent nativeOnScroll={ __capture(this.onScrollCapture) } />`
    );
    expect(code).toMatchSnapshot();
  });

  it("Throw error if sprecified in other than event handler", () => {
    expect(() => {
      transform(`<div foo={ __capture(this.onClick) } />`);
    }).toThrow(/only in event handler/);
  });

  it("Event name conversion (onFooBar -> fooBar)", () => {
    const code = transform(`<div onFooBar={ __capture(handler) } />`);
    expect(code).toMatch(/"!fooBar": /);
  });

  it("Event name conversion (nativeOnFooBar -> fooBar)", () => {
    const code = transform(`<div nativeOnFooBar={ __capture(handler) } />`);
    expect(code).toMatch(/"!fooBar": /);
  });

  it("Event name conversion (on-foo-bar -> foo-bar)", () => {
    const code = transform(`<div on-foo-bar={ __capture(handler) } />`);
    expect(code).toMatch(/"!foo-bar": /);
  });

  it("Event name conversion (nativeOn-foo-bar -> foo-bar)", () => {
    const code = transform(`<div nativeOn-foo-bar={ __capture(handler) } />`);
    expect(code).toMatch(/"!foo-bar": /);
  });
});

describe("__passive", () => {
  it("basic functionary", () => {
    const code = transform(
      `<div onScroll={ __passive(this.onScrollCapture) } />`
    );
    expect(code).toMatch(/"&scroll":/);
  });
});

describe("__once", () => {
  it("basic functionary", () => {
    const code = transform(`<div onScroll={ __once(this.onScrollCapture) } />`);
    expect(code).toMatch(/"~scroll":/);
  });
});

describe("__captureOnce", () => {
  it("basic functionary", () => {
    const code = transform(
      `<div onScroll={ __captureOnce(this.onScrollCapture) } />`
    );
    expect(code).toMatch(/"~!scroll":/);
  });
});
