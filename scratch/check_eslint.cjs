const { readFileSync } = require('fs');
const { Linter } = require('eslint');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const tseslint = require('@typescript-eslint/parser');

const linter = new Linter({ configType: 'flat' });
const config = [
    {
        files: ["**/*.tsx", "**/*.ts"],
        languageOptions: {
            parser: tseslint,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                ecmaVersion: "latest",
                sourceType: "module"
            }
        },
        plugins: {
            "react-hooks": reactHooksPlugin
        },
        rules: {
            "react-hooks/rules-of-hooks": "error"
        }
    }
];

function check(file) {
    const code = readFileSync(file, 'utf8');
    const messages = linter.verify(code, config, { filename: file });
    if (messages.length > 0) {
        console.log(`\n--- ${file} ---`);
        messages.forEach(m => console.log(`${m.line}:${m.column} - ${m.message}`));
    }
}

const glob = require('glob');
const files = glob.sync('src/**/*.{ts,tsx}');
files.forEach(check);
console.log("Check complete.");
