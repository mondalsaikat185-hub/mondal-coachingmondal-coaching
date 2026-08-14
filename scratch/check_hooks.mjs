import { ESLint } from "eslint";

async function runESLint() {
  const eslint = new ESLint({
    overrideConfig: [{
      languageOptions: {
        parserOptions: {
           ecmaFeatures: { jsx: true }
        }
      },
      plugins: {
        "react-hooks": (await import("eslint-plugin-react-hooks")).default
      },
      rules: {
        "react-hooks/rules-of-hooks": "error"
      }
    }]
  });

  const results = await eslint.lintFiles(["src/pages/StudentLibrary.tsx", "src/components/quiz/UnifiedQuizPlayer.tsx"]);
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = formatter.format(results);
  
  console.log(resultText || "No hook errors found!");
}

runESLint().catch(console.error);
