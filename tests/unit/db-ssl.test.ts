import { describe, expect, it } from "vitest";
import { connectionHint, normalizePem, poolConfig } from "@/lib/db/ssl";

const BODY = "MIIBszCCAVmgAwIBAgIUaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa==";
const PEM = `-----BEGIN CERTIFICATE-----\n${BODY.match(/.{1,64}/g)!.join("\n")}\n-----END CERTIFICATE-----`;

describe("certificado de la base de datos", () => {
  it("reconstruye el PEM aunque se haya pegado con espacios, \\n literales o comillas", () => {
    expect(normalizePem(PEM)).toEqual([PEM]);
    expect(normalizePem(PEM.replace(/\n/g, " "))).toEqual([PEM]);
    expect(normalizePem(PEM.replace(/\n/g, "\\n"))).toEqual([PEM]);
    expect(normalizePem(`"${PEM}"`)).toEqual([PEM]);
    expect(normalizePem(`${PEM}\n${PEM}`)).toHaveLength(2);
    expect(normalizePem("no es un certificado")).toEqual([]);
    expect(normalizePem(undefined)).toEqual([]);
  });

  it("con certificado: TLS verificado y sin sslmode en la URL (la URL prevalece en node-postgres)", () => {
    const { config, summary } = poolConfig("postgres://u:p@db.example.com:6543/postgres?sslmode=require", { DATABASE_CA_CERT: PEM });
    expect(config.connectionString).toBe("postgres://u:p@db.example.com:6543/postgres");
    expect(config.ssl).toEqual({ ca: [PEM], rejectUnauthorized: true });
    expect(summary).toMatchObject({ mode: "verify-ca", certificates: 1, host: "db.example.com", port: "6543" });
  });

  it("sin variables respeta la URL; el modo sin verificación es explícito", () => {
    expect(poolConfig("postgres://u:p@h/db?sslmode=require", {}).config).toEqual({ connectionString: "postgres://u:p@h/db?sslmode=require" });
    const nv = poolConfig("postgres://u:p@h/db?sslmode=require", { DATABASE_SSL_NO_VERIFY: "true" });
    expect(nv.config.ssl).toEqual({ rejectUnauthorized: false });
    expect(nv.summary.mode).toBe("no-verify");
  });

  it("explica el error de certificado según la causa", () => {
    const err = { code: "SELF_SIGNED_CERT_IN_CHAIN" };
    const url = "postgres://u:p@h/db?sslmode=require";
    expect(connectionHint(err, poolConfig(url, {}).summary, undefined)).toMatch(/Falta DATABASE_CA_CERT/);
    expect(connectionHint(err, poolConfig(url, { DATABASE_CA_CERT: "basura" }).summary, "basura")).toMatch(/no contiene un certificado/);
    expect(connectionHint(err, poolConfig(url, { DATABASE_CA_CERT: PEM }).summary, PEM)).toMatch(/no corresponde al servidor/);
    expect(connectionHint({ code: "28P01" }, poolConfig(url, {}).summary, undefined)).toMatch(/contraseña/);
  });
});
