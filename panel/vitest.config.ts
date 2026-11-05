import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      // Clave de prueba, fija, solo para que los tests de lib/crypto corran
      // sin depender de un .env.local. Nunca usar en producción.
      ENCRYPTION_KEY: "4MSyuJChn1JFIOW40NNDqrQEFWzuLJjOJ9qDDWD98P8=",
      SESSION_SECRET: "test-session-secret-no-usar-en-produccion",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // El paquete "server-only" tira un throw incondicional fuera de un
      // bundler que entienda la condicion de export "react-server" (que es
      // justamente lo que hace, a proposito, cuando algo lo importa desde
      // donde no debe). Vitest corre en Node llano, asi que lo apuntamos a
      // su propio stub vacio en vez de activar esa condicion globalmente
      // (que podria cambiar la resolucion de otros paquetes, como React).
      "server-only": path.resolve(__dirname, "node_modules/server-only/empty.js"),
    },
  },
});
