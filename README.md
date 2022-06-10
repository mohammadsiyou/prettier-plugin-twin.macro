# Prettier for twin.macro

Sort your [Tailwind](https://tailwindcss.com) CSS classes on [twin.macro](https://github.com/ben-rogerson/twin.macro) using [Prettier](https://prettier.io/).

## Features

- Format inline Tailwind CSS classes
- Format twin.macro template literals inside all style-components
- Support JavaScript, Flow, Typescript and JSX
- Ascend parent directories from current directory to find tailwind.config.js
- Groupify classes with bracket group
- Add !important to bracket groups

## How to install

Install `prettier-plugin-twin.macro` as a dev-dependency:

```bash
npm i --save-dev prettier-plugin-twin.macro prettier
```

or

```bash
yarn add -D prettier-plugin-twin.macro prettier
```

## How to use

Create a prettier.config.js file in the root directory and add the plugin.

```js
module.exports = {
  plugins: [require("prettier-plugin-twin.macro")],
};
```

Then format your code using Prettier CLI.

```
prettier --write  ./src/index.js
```

## Examples

CSS and arbitrary properties should have their position preserved

```js
<div tw="display[block] inline inline1 [display:block]" />
// ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓
<div tw="inline1 inline display[block] [display:block]" />
```

Groupify classes based on their variant with bracket group

```js
<div tw="sm:bg-red-100 sm:[display:inline] sm:hover:w-10 sm:hover:mt-4 sm:hover:before:p-4" />
// ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓
<div tw="sm:(bg-red-100 [display:inline] hover:(mt-4 w-10 before:p-4))" />
```

Add !important sign to bracket groups

```js
<div tw="!display[block] !inline" />
// ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓
<div tw="(inline display[block])!" />
```
