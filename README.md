# Prettier for twin.macro

Sort your [Tailwind](https://tailwindcss.com) CSS classes on [twin.macro](https://github.com/ben-rogerson/twin.macro) using [Prettier](https://prettier.io/).

## Features

- Format inline Tailwind CSS classes
- Format twin.macro template literals inside all style-components
- Support JavaScript, Flow, Typescript and JSX
- Ascend parent directories from current directory to find tailwind.config.js

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
