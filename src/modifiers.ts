const errmsg =
  "[vue-jsx-modifier] this method should be removed by babel.\n" +
  "Put 'babel-plugin-vue-jsx-modifier' into your babel configuration (before 'babel-plugin-transform-vue-jsx').";

export function __sync<T>(_: T): T {
  throw new Error(errmsg);
}

export function __capture<T extends (...args: any[]) => any>(_: T): T {
  throw new Error(errmsg);
}

export function __once<T extends (...args: any[]) => any>(_: T): T {
  throw new Error(errmsg);
}

export function __passive<T extends (...args: any[]) => any>(_: T): T {
  throw new Error(errmsg);
}

export function __captureOnce<T extends (...args: any[]) => any>(_: T): T {
  throw new Error(errmsg);
}
