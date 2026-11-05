// Corre automaticamente antes de "next start" (ver start.js). Aplica, en
// orden, cada archivo de db/migrations/*.sql que todavia no este registrado
// en la tabla schema_migrations. Pensado para correr una sola vez por boot
// y para no romper nunca una migracion ya aplicada: si el contenido de un
// archivo ya aplicado cambio, explota en vez de ignorarlo.
//
// Uso: node scripts/migrate.js   (tambien: npm run migrate)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");

const MIGRATIONS_DIR = path.join(__dirname, "..", "db", "migrations");

// Numero arbitrario fijo para el advisory lock -- solo importa que sea
// siempre el mismo numero para esta app, para que dos boots simultaneos no
// corran migraciones en paralelo.
const ADVISORY_LOCK_KEY = 0x4e6f7661; // "Nova" en hex, sin significado especial

// Migraciones que ya estaban aplicadas a mano en produccion ANTES de que
// existiera este runner. Se usan solo para el auto-bootstrap (ver abajo):
// nunca se ejecutan, solo se registran como ya aplicadas.
const PRE_EXISTING = [
  "0001_init.sql",
  "0002_seed.sql",
  "0003_allow_pending_one_off_payments.sql",
  "0004_dashboard_recurring_oneoff_split.sql",
  "0005_payment_out_type.sql",
  "0006_dashboard_pending_oneoff.sql",
];

// Datos de prueba (usuarios con contraseña conocida, etc.) -- nunca se
// corren solos, ni siquiera en una base nueva vacia (por ej. un ambiente de
// staging futuro). Si alguna vez hace falta, correrlos a mano con
// RUN_SEED_MIGRATIONS=true node scripts/migrate.js
const SEED_FILES = new Set(["0002_seed.sql"]);

function needsSsl(connectionString) {
  if (!connectionString) return false;
  try {
    const { hostname } = new URL(connectionString);
    return hostname !== "localhost" && hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

function checksum(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[migrate] falta DATABASE_URL");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  try {
    await client.query("select pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);

    await client.query(`
      create table if not exists schema_migrations (
        filename text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `);

    // Auto-bootstrap: la primera vez que este runner corre contra una base
    // que YA tiene el esquema viejo (0001-0006 aplicados a mano, antes de
    // que este script existiera), hay que registrarlas como aplicadas SIN
    // volver a ejecutarlas (si no, "create table" explota porque ya existen).
    // Se detecta mirando si la tabla `profiles` ya existe mientras
    // schema_migrations todavia esta vacia. Una base nueva de verdad (sin
    // `profiles`) no entra por acá, y corre 0001 en adelante de forma normal.
    const { rows: countRows } = await client.query("select count(*)::int as n from schema_migrations");
    if (countRows[0].n === 0) {
      const { rows: existsRows } = await client.query(
        `select exists (
           select 1 from information_schema.tables
           where table_schema = 'public' and table_name = 'profiles'
         ) as exists`
      );
      if (existsRows[0].exists) {
        console.log("[migrate] esquema preexistente detectado, haciendo bootstrap...");
        for (const filename of PRE_EXISTING) {
          const fullPath = path.join(MIGRATIONS_DIR, filename);
          if (!fs.existsSync(fullPath)) continue;
          const sum = checksum(fs.readFileSync(fullPath, "utf8"));
          await client.query(
            "insert into schema_migrations (filename, checksum) values ($1, $2) on conflict (filename) do nothing",
            [filename, sum]
          );
          console.log(`[migrate] ${filename} marcada como ya aplicada (bootstrap).`);
        }
      }
    }

    const { rows: appliedRows } = await client.query(
      "select filename, checksum from schema_migrations"
    );
    const applied = new Map(appliedRows.map((r) => [r.filename, r.checksum]));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("[migrate] no hay archivos de migracion en", MIGRATIONS_DIR);
      return;
    }

    for (const filename of files) {
      const fullPath = path.join(MIGRATIONS_DIR, filename);
      const content = fs.readFileSync(fullPath, "utf8");
      const sum = checksum(content);

      if (applied.has(filename)) {
        if (applied.get(filename) !== sum) {
          throw new Error(
            `[migrate] "${filename}" ya esta aplicada pero su contenido cambio en disco. ` +
              `Nunca edites una migracion ya aplicada -- agrega una nueva.`
          );
        }
        continue;
      }

      if (SEED_FILES.has(filename) && process.env.RUN_SEED_MIGRATIONS !== "true") {
        console.log(`[migrate] salteando ${filename} (datos de prueba, no se corre sola).`);
        continue;
      }

      console.log(`[migrate] aplicando ${filename}...`);
      await client.query("begin");
      try {
        await client.query(content);
        await client.query(
          "insert into schema_migrations (filename, checksum) values ($1, $2)",
          [filename, sum]
        );
        await client.query("commit");
        console.log(`[migrate] ${filename} aplicada.`);
      } catch (err) {
        await client.query("rollback");
        throw err;
      }
    }

    console.log("[migrate] listo, esquema al dia.");
  } finally {
    await client.query("select pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]).catch(() => {});
    await client.end();
  }
}

main().catch((err) => {
  console.error("[migrate] FALLO:", err.message);
  process.exit(1);
});
