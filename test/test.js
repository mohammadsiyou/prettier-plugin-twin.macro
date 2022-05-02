const prettier = require("prettier");
const path = require("path");

function format(str, options = {}) {
  return prettier
    .format(str, {
      // pluginSearchDirs: [path.join(__dirname, "..")], // disable plugin autoload
      plugins: [path.join(__dirname, "..")],
      semi: false,
      singleQuote: true,
      printWidth: 9999,
      parser: "babel",
      ...options,
    })
    .trim();
}

const output = format(';<div class="sm:lowercase uppercase potato text-sm" />');

console.log(output);
