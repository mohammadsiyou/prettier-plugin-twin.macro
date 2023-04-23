const prettier = require("prettier");
const path = require("path");
const { execSync } = require("child_process");
const test = require("ava");

//https://github.com/tailwindlabs/prettier-plugin-tailwindcss/blob/main/tests/test.js

function formatFixture(name) {
  let binPath = path.resolve(__dirname, "../node_modules/.bin/prettier");
  let filePath = path.resolve(__dirname, `fixtures/${name}.js`);

  return execSync(
    `${binPath} ${filePath} --plugin-search-dir ${__dirname} --plugin ${path.resolve(
      __dirname,
      ".."
    )}`
  )
    .toString()
    .trim();
}

function format(str, options = {}) {
  return prettier
    .format(str, {
      pluginSearchDirs: [__dirname],
      plugins: [path.join(__dirname, "..")],
      semi: true,
      singleQuote: false,
      parser: "babel",
      ...options,
    })
    .trim();
}

const cases = [
  [
    "Double quotation string",
    ';<div tw="sm:lowercase uppercase potato text-sm"></div>',
    '<div tw="potato text-sm uppercase sm:lowercase"></div>;',
  ],
  [
    "Extera space",
    ';<div tw=" sm:lowercase  uppercase potato    text-sm "></div>',
    '<div tw="potato text-sm uppercase sm:lowercase"></div>;',
  ],
  [
    "Single quotation string",
    ";<div tw='sm:lowercase uppercase potato text-sm'></div>",
    '<div tw="potato text-sm uppercase sm:lowercase"></div>;',
  ],
  [
    "Double quotation string inside JSX expression",
    ';<div tw={"sm:lowercase uppercase potato text-sm"}></div>',
    '<div tw={"potato text-sm uppercase sm:lowercase"}></div>;',
  ],
  [
    "Single quotation string inside JSX expression",
    ";<div tw={'sm:lowercase uppercase potato text-sm'}></div>",
    '<div tw={"potato text-sm uppercase sm:lowercase"}></div>;',
  ],
  [
    "Backtick string inside JSX expression",
    ";<div tw={`sm:lowercase uppercase potato text-sm`}></div>",
    "<div tw={`potato text-sm uppercase sm:lowercase`}></div>;",
  ],
  ["Empty tw property", ';<div tw=""></div>', '<div tw=""></div>;'],
  ["No tw property", ";<div></div>", "<div></div>;"],
  [
    "Priority",
    ';<div tw="display[block] inline inline1 [display:block]"></div>',
    '<div tw="inline1 inline display[block] [display:block]"></div>;',
  ],
  [
    "Priority + Groupify",
    ';<div tw="display[block] inline inline1 sm:bg-red-100 sm:[display:inline] sm:inline1 sm:hover:w-10 sm:hover:mt-4 sm:hover:before:p-4"></div>',
    '<div tw="inline1 inline display[block] sm:(inline1 bg-red-100 [display:inline] hover:(mt-4 w-10 before:p-4))"></div>;',
  ],
  [
    "Important sign",
    ';<div tw="!display[block] !inline !inline1"></div>',
    '<div tw="!(inline1 inline display[block])"></div>;',
  ],
];

cases.forEach(([title, input, expectedOutput]) => {
  const actualOutput = format(input);

  test(title, (t) => {
    t.is(
      expectedOutput,
      actualOutput,
      `Expected:\n${expectedOutput}\n\nActual:\n${actualOutput}`
    );
  });
});

test("Inline TW component", (t) => {
  const actualOutput = formatFixture("inline");
  const expectedOutput = '<div tw="bg-red-500 sm:bg-tomato" />;';

  t.is(
    expectedOutput,
    actualOutput,
    `Expected:\n${expectedOutput}\n\nActual:\n${actualOutput}`
  );
});

test("TW block", (t) => {
  const actualOutput = formatFixture("block");
  const expectedOutput =
    'import tw from "twin.macro";\ntw`bg-red-500 sm:bg-tomato`;';

  t.is(
    expectedOutput,
    actualOutput,
    `Expected:\n${expectedOutput}\n\nActual:\n${actualOutput}`
  );
});

test("TW Styled component", (t) => {
  const actualOutput = formatFixture("styled");
  const expectedOutput =
    'import tw from "twin.macro";\ntw.div`bg-red-500 sm:bg-tomato`;';

  t.is(
    expectedOutput,
    actualOutput,
    `Expected:\n${expectedOutput}\n\nActual:\n${actualOutput}`
  );
});

test("TW clone component", (t) => {
  const actualOutput = formatFixture("clone");
  const expectedOutput =
    'import tw from "twin.macro";\ntw(<div />)`bg-red-500 sm:bg-tomato`;';

  t.is(
    expectedOutput,
    actualOutput,
    `Expected:\n${expectedOutput}\n\nActual:\n${actualOutput}`
  );
});

test("twin.macro not imported", (t) => {
  const actualOutput = formatFixture("not-imported");

  const expectedOutput = [
    'import tw2 from "not-exist";',
    "let tw = () => {};",
    "tw`sm:bg-tomato bg-red-500`;",
    "tw = { div: () => {} };",
    "tw.div`sm:bg-tomato bg-red-500`;",
    "tw2(<div />)`sm:bg-tomato bg-red-500`;",
  ].join("\n");

  t.is(
    expectedOutput,
    actualOutput,
    `Expected:\n${expectedOutput}\n\nActual:\n${actualOutput}`
  );
});

test("Duplicate imported", (t) => {
  const actualOutput = formatFixture("duplicate-imported");

  const expectedOutput = [
    'import tw from "twin.macro";',
    'import tw1 from "twin.macro";',
    'import tw2 from "twin.macro";',
    "tw`bg-red-500 sm:bg-tomato`;",
    "tw1.div`bg-red-500 sm:bg-tomato`;",
    "tw2(<div />)`bg-red-500 sm:bg-tomato`;",
  ].join("\n");

  t.is(
    expectedOutput,
    actualOutput,
    `Expected:\n${expectedOutput}\n\nActual:\n${actualOutput}`
  );
});
