// Integracion contra un Postgres vacio (ver instrucciones en lib/trends/pipeline.db.test.ts).
// RUN_DB_TESTS=1 DATABASE_URL=... npx vitest run lib/credentials/store.db.test.ts
import { describe, expect, it } from "vitest";
import { query, queryOne } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { listClientCredentials } from "./store";

describe.skipIf(!process.env.RUN_DB_TESTS)("accesos de clientes (integración)", () => {
  it("guarda todo cifrado y la lista nunca trae la contraseña", async () => {
    const client = (await queryOne<{ id: string }>("insert into clients (name) values ('Accesos test') returning id"))!;
    await query(
      `insert into client_credentials (client_id, platform, label, username_enc, password_enc, notes_enc)
       values ($1, 'instagram', '@cuenta', $2, $3, $4)`,
      [client.id, encrypt("usuario@mail.com"), encrypt("Secreta#123"), encrypt("codigos de respaldo: 1111")]
    );

    const raw = await queryOne<{ username_enc: string; password_enc: string; notes_enc: string }>(
      "select username_enc, password_enc, notes_enc from client_credentials where client_id = $1",
      [client.id]
    );
    // En la base no hay texto plano
    expect(JSON.stringify(raw)).not.toContain("Secreta#123");
    expect(JSON.stringify(raw)).not.toContain("usuario@mail.com");
    expect(decrypt(raw!.password_enc)).toBe("Secreta#123");

    const list = await listClientCredentials(client.id);
    expect(list).toHaveLength(1);
    expect(list[0].username).toBe("usuario@mail.com");
    expect(list[0].has_password).toBe(true);
    expect(list[0].notes).toContain("1111");
    expect(JSON.stringify(list)).not.toContain("Secreta#123");

    // Al borrar el cliente se borran sus accesos
    await query("delete from clients where id = $1", [client.id]);
    const left = await queryOne<{ n: number }>("select count(*)::int as n from client_credentials where client_id = $1", [client.id]);
    expect(left?.n).toBe(0);
  });
});
