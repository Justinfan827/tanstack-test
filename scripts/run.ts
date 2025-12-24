
const [, , scriptName, ...scriptArgs] = process.argv;

if (!scriptName) {
  console.error("Usage: npm run script <script-name> [args]");
  process.exit(1);
}

const scriptPath = `./${scriptName}.ts`;

(async () => {
  try {
    const mod = await import(scriptPath);

    if (typeof mod.default === "function") {
      await mod.default(scriptArgs);
    }
  } catch (err) {
    console.error(`Failed to run script: ${scriptName}`);
    console.error(err);
    process.exit(1);
  }
})();
