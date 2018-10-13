import * as babel from "@babel/core";
import * as t from "@babel/types";
import { NodePath, Scope } from "@babel/traverse";
import jsx from "@babel/plugin-syntax-jsx";

interface State {
  on: t.ObjectProperty[];
  nativeOn: t.ObjectProperty[];
}

type EventModifierName = "once" | "capture" | "passive" | "captureOnce";
type ModifierName = "sync" | "relay" | EventModifierName;

const KnownAttrs = [
  "class",
  "staticClass",
  "style",
  "key",
  "ref",
  "refInFor",
  "slot",
  "scopedSlots"
];

const ModifierFuncNames: { [K in ModifierName]: string } = {
  sync: "__sync",
  relay: "__relay",
  once: "__once",
  capture: "__capture",
  passive: "__passive",
  captureOnce: "__captureOnce"
};

const EventPrefixes: { [K in EventModifierName]: string } = {
  once: "~",
  capture: "!",
  passive: "&",
  captureOnce: "~!"
};

function toCamelCase(value: string): string {
  return value.replace(/\-([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

function getUnusedVariableName(scope: Scope, prefix: string): string {
  const bindings = scope.bindings;
  for (let i = 0; ; ++i) {
    const varName = prefix + i.toString();
    if (!bindings[varName]) {
      return varName;
    }
  }
}

function getJSXAttributeName(node: t.JSXAttribute): string {
  const { name } = node;
  if (t.isJSXIdentifier(name)) {
    return name.name;
  } else {
    // name is JSXNamespacedName
    return name.namespace.name + ":" + name.name.name;
  }
}

function getModifierName(callee: t.Expression): ModifierName | undefined {
  let name: string;
  if (t.isIdentifier(callee)) {
    name = callee.name;
  } else if (t.isMemberExpression(callee)) {
    const { object, property } = callee;
    if (t.isIdentifier(object) && t.isIdentifier(property)) {
      name = property.name;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
  for (const key in ModifierFuncNames) {
    const modifier = key as ModifierName;
    if (name === ModifierFuncNames[modifier]) {
      return modifier;
    }
  }
  return undefined;
}

function createAssignmentFunction(
  target: t.MemberExpression,
  argName: string
): t.ArrowFunctionExpression {
  /*
   * <argName> => {
   *   <target> = <argName>;
   * }
   */
  return t.arrowFunctionExpression(
    [t.identifier(argName)],
    t.blockStatement([
      t.expressionStatement(
        t.assignmentExpression("=", target, t.identifier(argName))
      )
    ])
  );
}

function createEmitFunction(
  eventName: t.Expression,
  argName: string
): t.ArrowFunctionExpression {
  /*
   * <argName> => {
   *   this.$emit("update:<propName>", <argName>);
   * }
   */
  return t.arrowFunctionExpression(
    [t.identifier(argName)],
    t.blockStatement([
      t.expressionStatement(
        t.callExpression(
          t.memberExpression(t.thisExpression(), t.identifier("$emit")),
          [eventName, t.identifier(argName)]
        )
      )
    ])
  );
}

function processSyncModifier(
  state: State,
  modifierName: "sync" | "relay",
  path: NodePath<t.CallExpression>,
  jsxAttrPath: NodePath<t.JSXAttribute>
): void {
  /**
   *  <tag propName={ __sync(foo.bar) }>...
   *        \         \_path  \_content
   *         \_jsxAttr
   */
  const attrName = getJSXAttributeName(jsxAttrPath.node);
  if (
    KnownAttrs.indexOf(attrName) >= 0 ||
    /^(domProps|on|nativeOn|hook)[\-_A-Z]/.test(attrName)
  ) {
    throw path.buildCodeFrameError(
      `${modifierName} modifier can be used only in component prop`
    );
  }
  if (path.node.arguments.length !== 1) {
    throw path.buildCodeFrameError(
      `${modifierName} modifier must have one argument`
    );
  }
  const arg = path.node.arguments[0];
  if (!t.isMemberExpression(arg)) {
    throw path.buildCodeFrameError(
      `argument of ${modifierName} modifier must be MemberExpression`
    );
  }
  if (modifierName == "sync") {
    // remove sync call
    path.replaceWith(arg);
    // add update handler
    state.on.push(
      t.objectProperty(
        t.stringLiteral(`update:${toCamelCase(attrName)}`),
        createAssignmentFunction(arg, getUnusedVariableName(path.scope, "_v"))
      )
    );
  } else {
    // relay
    let eventName: t.Expression;
    if (arg.computed) {
      if (t.isStringLiteral(arg.property)) {
        eventName = t.stringLiteral("update:" + arg.property.value);
      } else {
        eventName = t.binaryExpression(
          "+",
          t.stringLiteral("update:"),
          arg.property
        );
      }
    } else if (t.isIdentifier(arg.property)) {
      eventName = t.stringLiteral("update:" + arg.property.name);
    } else {
      throw path.buildCodeFrameError(`Failed to determine event name to emit`);
    }
    // remove sync call
    path.replaceWith(arg);
    // add update handler
    state.on.push(
      t.objectProperty(
        t.stringLiteral(`update:${toCamelCase(attrName)}`),
        createEmitFunction(eventName, getUnusedVariableName(path.scope, "_v"))
      )
    );
  }
}

function processEventModifier(
  state: State,
  modifierName: EventModifierName,
  path: NodePath<t.CallExpression>,
  jsxAttrPath: NodePath<t.JSXAttribute>
): void {
  /**
   *  <tag onClick={ __capture(handler) }>...
   *        \        \_path    \_content
   *         \_jsxAttr
   */
  const attrName = getJSXAttributeName(jsxAttrPath.node);
  const match = /^(on|nativeOn)([\-_A-Z])(.*)$/.exec(attrName);
  if (!match) {
    throw path.buildCodeFrameError(
      `${modifierName} modifier can be used only in event handler`
    );
  }
  const eventType = match[1];
  const eventName = (match[2] === "-" ? "" : match[2].toLowerCase()) + match[3];
  const prefix = EventPrefixes[modifierName];
  if (path.node.arguments.length !== 1) {
    throw path.buildCodeFrameError(
      `${modifierName} modifier must have one argument`
    );
  }
  const arg = path.node.arguments[0];
  if (t.isSpreadElement(arg)) {
    throw path.buildCodeFrameError(
      `${modifierName} modifier have one argument`
    );
  }
  if (t.isJSXNamespacedName(arg)) {
    throw path.buildCodeFrameError(
      `${modifierName} modifier argument must not be JSXNamespacedName`
    );
  }
  // remove JSXAttribute
  jsxAttrPath.remove();
  // add prefixed event handler
  (eventType === "on" ? state.on : state.nativeOn).push(
    t.objectProperty(t.stringLiteral(prefix + eventName), arg)
  );
}

const jsxOpeningElementVisitor: babel.Visitor<any> = {
  CallExpression(path) {
    /**
     * Transform modifier calls
     *
     * Code pattern to be transformed:
     *  <tag propName={ __sync(foo.bar) }>...
     *        \        \ \__target [CallExpression]
     *         \        \__parent [JSXExpressionContainer]
     *          \__grand parent [JSXAttribute]
     */
    if (!t.isJSXExpressionContainer(path.parent)) {
      return;
    }
    const grandParentPath = path.parentPath.parentPath;
    if (!t.isJSXAttribute(grandParentPath.node)) {
      return;
    }
    const jsxAttrPath = grandParentPath as NodePath<t.JSXAttribute>;
    const modifier = getModifierName(path.node.callee);
    if (!modifier) {
      return;
    }
    if (modifier === "sync" || modifier === "relay") {
      processSyncModifier(this, modifier, path, jsxAttrPath);
    } else {
      processEventModifier(this, modifier, path, jsxAttrPath);
    }
  }
} as babel.Visitor<State>;

export = function() {
  const plugin: babel.PluginObj = {
    name: "vue-jsx-modifier",
    inherits: jsx,
    visitor: {
      JSXOpeningElement(path) {
        const on = [] as t.ObjectProperty[];
        const nativeOn = [] as t.ObjectProperty[];
        path.traverse(jsxOpeningElementVisitor, { on, nativeOn });
        if (on.length > 0 || nativeOn.length > 0) {
          const vnodeData = t.objectExpression([]);
          for (const key of ["on", "nativeOn"]) {
            const obj = key === "on" ? on : nativeOn;
            if (obj.length == 0) {
              continue;
            }
            vnodeData.properties.push(
              t.objectProperty(t.identifier(key), t.objectExpression(obj))
            );
          }
          path.node.attributes.push(t.jsxSpreadAttribute(vnodeData) as any);
        }
      }
    }
  };
  return plugin;
};
