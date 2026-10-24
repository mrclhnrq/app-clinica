const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test, afterEach } = require("node:test");
const ts = require("typescript");

const source = readFileSync(path.join(__dirname, "../src/services/funcionarios.ts"), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const sandbox = { exports: {}, process: { env: { EXPO_PUBLIC_API_URL: "http://backend.test/" } }, TypeError, AbortController, setTimeout, clearTimeout, fetch: (...args) => global.fetch(...args) };
vm.runInNewContext(output.outputText, sandbox);
const api = sandbox.exports;
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; api.setEmployeesTokenProvider(() => "admin-session"); });
const values = { nome: "Ana Silva", cpf: "534.282.138-07", email: "ana@example.com", telefone: "11987654321", descricao: "Esteticista", senha: "Estetica@2026", confirmarSenha: "Estetica@2026" };
const employee = { idFuncionario: 7, nome: values.nome, CPF: "53428213807", email: values.email, telefone: values.telefone, descricao: values.descricao };

test("validates CPF check digits, repeated digits and format", () => {
  for (const cpf of ["53428213807", "534.282.138-07"]) assert.equal(api.validCpf(cpf), true);
  for (const cpf of ["11111111111", "53428213808", "abc53428213807", ""]) assert.equal(api.validCpf(cpf), false);
});

test("create payload matches DTO and excludes confirmation and unsupported fields", () => {
  const payload = api.employeePayload(values, false);
  assert.equal(payload.cpf, "53428213807");
  assert.equal(payload.senha, values.senha);
  assert.deepEqual(Object.keys(payload).sort(), ["cpf", "descricao", "email", "nome", "senha", "telefone"]);
});

test("validates required fields, sizes, password complexity and confirmation", () => {
  const invalid = [{ nome: "ab" }, { nome: "a".repeat(151) }, { email: "invalid" }, { telefone: "123" }, { telefone: "1234567a" }, { descricao: " " }, { descricao: "a".repeat(256) }, { senha: "weak" }, { senha: "Abcdefghi1!".repeat(2) }, { confirmarSenha: "different" }, { cpf: "00000000000" }];
  for (const change of invalid) assert.throws(() => api.employeePayload({ ...values, ...change }, false));
});

test("editing omits unchanged password and validates optional password changes", () => {
  assert.equal("senha" in api.employeePayload({ ...values, senha: "", confirmarSenha: "" }, true), false);
  assert.throws(() => api.employeePayload({ ...values, senha: "", confirmarSenha: "x" }, true));
  assert.equal(api.employeePayload(values, true).senha, values.senha);
});

test("detects duplicate normalized CPF and case insensitive email, excluding current employee", () => {
  const payload = api.employeePayload(values, false);
  assert.throws(() => api.ensureUniqueEmployee(payload, [employee]));
  assert.throws(() => api.ensureUniqueEmployee({ ...payload, cpf: "other" }, [{ ...employee, email: values.email.toUpperCase() }]));
  assert.doesNotThrow(() => api.ensureUniqueEmployee(payload, [employee], 7));
  assert.equal(api.employeeCpf({ cpf: "123" }), "123");
});

test("missing session prevents unauthenticated requests", async () => {
  api.setEmployeesTokenProvider(() => null);
  global.fetch = () => assert.fail("must not request without token");
  await assert.rejects(api.employeeRequest(), /administrador/);
});

test("all supported routes use Bearer auth, encoded search, JSON bodies and handle 204", async () => {
  api.setEmployeesTokenProvider(async () => "admin-session");
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return options.method === "DELETE" ? new Response(null, { status: 204 }) : new Response(JSON.stringify(options.method === "GET" && !url.endsWith("/7") ? [employee] : employee), { status: options.method === "POST" ? 201 : 200 });
  };
  assert.equal((await api.employeeRequest())[0].idFuncionario, 7);
  await api.employeeRequest("?busca=Ana%20Silva");
  assert.equal((await api.employeeRequest("/7")).nome, values.nome);
  await api.employeeRequest("", "POST", api.employeePayload(values, false));
  await api.employeeRequest("/7", "PUT", api.employeePayload({ ...values, senha: "", confirmarSenha: "" }, true));
  assert.equal(await api.employeeRequest("/7", "DELETE"), undefined);
  assert.equal(calls[1].url, "http://backend.test/funcionarios?busca=Ana%20Silva");
  assert.equal(calls[3].options.headers["Content-Type"], "application/json");
  assert.equal(JSON.parse(calls[3].options.body).cpf, "53428213807");
  assert.equal("senha" in JSON.parse(calls[4].options.body), false);
  for (const call of calls) assert.equal(call.options.headers.Authorization, "Bearer admin-session");
});

test("reports auth, validation, ambiguous 404 and server errors without retrying writes", async () => {
  for (const [status, pattern] of [[401, /Sessão/], [403, /administradores/], [404, /recusada/], [409, /duplicados/], [500, /servidor/]]) {
    let calls = 0;
    global.fetch = async () => { calls++; return new Response(null, { status }); };
    await assert.rejects(api.employeeRequest("/7", "PUT", api.employeePayload(values, true)), pattern);
    assert.equal(calls, 1);
  }
  global.fetch = async () => new Response(JSON.stringify({ errors: [{ field: "cpf", defaultMessage: "CPF inválido" }] }), { status: 400 });
  await assert.rejects(api.employeeRequest(), /cpf: CPF inválido/);
});

test("forwards cancellation and handles network failures", async () => {
  const controller = new AbortController();
  controller.abort();
  global.fetch = async (_url, options) => { assert.equal(options.signal.aborted, true); throw new Error("aborted"); };
  await assert.rejects(api.employeeRequest("", "GET", undefined, controller.signal), /aborted/);
  global.fetch = async () => { throw new TypeError("network"); };
  await assert.rejects(api.employeeRequest(), /conectar ao backend/);
});
