//  @ts-check

/** @type {import('prettier').Config} */
const config = {
  // semi: false,
  // singleQuote: true,
  // trailingComma: 'all',
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',
  htmlWhitespaceSensitivity: 'css',
  insertPragma: false,
  singleAttributePerLine: false,
  bracketSameLine: false,
  jsxBracketSameLine: false,
  jsxSingleQuote: false,
  proseWrap: 'preserve',
  quoteProps: 'as-needed',
  requirePragma: false,
  semi: true,
  singleQuote: false,
  tabWidth: 4,
  trailingComma: 'es5',
  useTabs: true,
  vueIndentScriptAndStyle: false,
  parser: 'typescript',
  printWidth: 90,
  embeddedLanguageFormatting: 'auto',
}

export default config
