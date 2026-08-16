const { spawn } = require("child_process");

const port = process.env.PORT || "3001";
const child = spawn("next", ["start", "-p", port], { stdio: "inherit", shell: true });

child.on("exit", (code) => process.exit(code ?? 0));
