declare module "@babel/parser" {
  // workaround to avoid problem in @types/babel__core
  export {
    ParserOptions as ParseOptions
  } from "@babel/parser/typings/babel-parser";
}

declare module "@babel/plugin-syntax-jsx";
