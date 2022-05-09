const prettier = require('prettier');
const path = require('path');
const { execSync } = require('child_process');

function formatFixture(name) {
    let binPath = path.resolve(__dirname, '../node_modules/.bin/prettier');
    let filePath = path.resolve(__dirname, `fixtures/${name}.js`);

    return execSync(
        `${binPath} ${filePath} --plugin-search-dir ${__dirname} --plugin ${path.resolve(
            __dirname,
            '..',
        )}`,
    )
        .toString()
        .trim();
}


const output1 = formatFixture('basic');

console.log(output1);

function format(str, options = {}) {
    return prettier
        .format(str, {
            // pluginSearchDirs: [path.join(__dirname, "..")], // disable plugin autoload
            plugins: [path.join(__dirname, '..')],
            semi: false,
            singleQuote: true,
            printWidth: 9999,
            parser: 'babel',
            ...options,
        })
        .trim();
}

// const output2 = format(';<div class="sm:lowercase uppercase potato text-sm" />');

// console.log(output2);
