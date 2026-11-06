const { spawnSync, spawn } = require("child_process");
const path = require("path");

// Aplica migraciones pendientes antes de levantar el server. Si falla, no
// arranca next (mejor que arrancar contra un esquema a medio migrar).
// Sin shell: true -- con shell los args no se escapan en Windows, y un
// path con espacios (como el checkout local de este repo) rompe el arranque.
const migrate = spawnSync("node", [path.join(__dirname, "migrate.js")], {
  stdio: "inherit",
});
if (migrate.status !== 0) {
  console.error("[start] migrate.js fallo, no arranco el server.");
  process.exit(migrate.status ?? 1);
}

const port = process.env.PORT || "3001";
const child = spawn("next", ["start", "-p", port], { stdio: "inherit", shell: true });

child.on("exit", (code) => process.exit(code ?? 0));
