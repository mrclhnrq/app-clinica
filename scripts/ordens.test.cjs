const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test, afterEach } = require("node:test");
const ts = require("typescript");
const source = readFileSync(path.join(__dirname, "../src/services/ordens.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const sandbox = { exports: {}, process: { env: { EXPO_PUBLIC_API_URL: "http://main.test/", EXPO_PUBLIC_ORDERS_API_URL: "http://orders.test/" } }, TypeError, AbortController, setTimeout, clearTimeout, fetch: (...args) => global.fetch(...args) };
vm.runInNewContext(compiled.outputText, sandbox);
const api = sandbox.exports;
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; api.setOrdersTokenProvider(() => "session"); });
const relations = {
  clients: [{ id: 1, nomeCompleto: "Cliente real" }], users: [{ id: 8, nome: "Responsável" }],
  catalog: [{ idProdutoServico: 3, nome: "Serviço", produto: false, ativo: true, valorVenda: 125.5 }, { idProdutoServico: 4, nome: "Produto", produto: true, ativo: true, valorVenda: 32.9 }],
  combos: [{ idCombo: 2, nome: "Combo", ativo: true, valorFinal: 180 }],
};
const items = [{ servicoProdutoId: 3, quantidade: 1, desconto: 0 }, { produtoId: 4, quantidade: 2, desconto: 0 }];
const original = { id: 10, clienteId: 1, usuarioId: 8, valorFinal: 170, dataCriacao: "2026-10-24", observacao: "", itens: items };
const payload = (changes = {}) => api.orderPayload(changes.client ?? 1, changes.user ?? 8, changes.notes ?? "  Observação  ", changes.items ?? items, changes.relations ?? relations, changes.original);
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

test("payload uses usuarioId, correct item relationships and currency rounding", () => {
  const result = payload();
  assert.equal(result.valorFinal, 191.3);
  assert.equal(result.usuarioId, 8);
  assert.equal(result.observacao, "Observação");
  assert.equal(result.itens[1].produtoId, 4);
  assert.equal(result.itens[1].ehProduto, true);
  assert.equal(result.itens[0].nomeServicoProduto, "Serviço");
  assert.deepEqual(Object.keys(result).sort(), ["clienteId", "itens", "observacao", "usuarioId", "valorFinal"]);
});

test("rejects missing relationships, invalid quantities, discounts and duplicate items", () => {
  for (const changes of [{ client: 0 }, { client: 7 }, { user: 0 }, { user: 7 }, { notes: "a".repeat(256) },
    ...[0, -1, 1.5, Infinity, 2147483648].map(quantidade => ({ items: [{ ...items[0], quantidade }] })),
    ...[-1, 101, NaN].map(desconto => ({ items: [{ ...items[0], desconto }] })),
    { items: [items[0], items[0]] }, { items: [{ ...items[0], produtoId: 4 }] }, { items: [{ ...items[0], servicoProdutoId: 99 }] }]) assert.throws(() => payload(changes));
});

test("preserves saved total and inactive historical items when items are unchanged", () => {
  assert.equal(payload({ original }).valorFinal, 170);
  const inactive = { ...relations, catalog: relations.catalog.map(item => ({ ...item, ativo: false })) };
  assert.equal(payload({ original, relations: inactive }).valorFinal, 170);
  assert.throws(() => payload({ relations: inactive }));
});

test("supports combos and preserves backend values for unchanged legacy combos", () => {
  const comboItems = [{ comboId: 2, quantidade: 2, desconto: 10 }];
  const result = payload({ items: comboItems });
  assert.equal(result.valorFinal, 324);
  assert.equal(result.itens[0].nomeCombo, "Combo");
  assert.equal(api.itemName(comboItems[0], relations), "Combo");
  const legacy = { ...original, itens: [{ comboId: 999, quantidade: 1, desconto: 0 }] };
  assert.equal(payload({ original: legacy, items: legacy.itens }).valorFinal, 170);
  assert.throws(() => payload({ items: legacy.itens }));
});

test("rejects negative or nonfinite catalog prices and mismatched product types", () => {
  for (const valorVenda of [-1, NaN, Infinity]) assert.throws(() => payload({ relations: { ...relations, catalog: [{ ...relations.catalog[0], valorVenda }] } }));
  assert.throws(() => payload({ items: [{ produtoId: 3, quantidade: 1, desconto: 0 }] }));
});

test("loads all fixed-size backend pages", async () => {
  const urls = [];
  global.fetch = async url => { urls.push(url); return json({ content: [{ ...original, id: urls.length }], totalPages: 3 }); };
  assert.equal((await api.listOrders()).length, 3);
  assert.deepEqual(urls, [0, 1, 2].map(page => `http://orders.test/ordens-servico?page=${page}`));
});

test("CRUD uses verified routes, Bearer auth, JSON, and handles 204", async () => {
  api.setOrdersTokenProvider(() => "session");
  const calls = [];
  global.fetch = async (url, options) => { calls.push({ url, options }); return options.method === "DELETE" ? new Response(null, { status: 204 }) : json(original); };
  await api.orderRequest("/ordens-servico/10");
  await api.orderRequest("/ordens-servico", "POST", payload());
  await api.orderRequest("/ordens-servico/10", "PUT", payload({ original }));
  assert.equal(await api.orderRequest("/ordens-servico/10", "DELETE"), undefined);
  assert.deepEqual(calls.map(call => call.options.method), ["GET", "POST", "PUT", "DELETE"]);
  for (const call of calls) assert.equal(call.options.headers.Authorization, "Bearer session");
  assert.equal(JSON.parse(calls[2].options.body).valorFinal, 170);
});

test("related data uses main backend and requires authentication", async () => {
  api.setOrdersTokenProvider(() => null);
  global.fetch = () => assert.fail("missing token must prevent related requests");
  await assert.rejects(api.loadOrderRelations(), /token/);
  api.setOrdersTokenProvider(() => "session");
  const urls = [];
  global.fetch = async url => { urls.push(url); return new Response(null, { status: 204 }); };
  const data = await api.loadOrderRelations();
  assert.equal(data.users.length, 0);
  assert.deepEqual(urls.sort(), ["/cliente", "/usuarios", "/servico-produto?status=TODOS", "/combo?status=TODOS"].map(path => "http://main.test" + path).sort());
});

test("surfaces backend erro messages, permission failures, network and abort errors", async () => {
  global.fetch = async () => json({ erro: "Ordem de servico nao encontrada" }, 404);
  await assert.rejects(api.orderRequest("/ordens-servico/10"), /Ordem de servico nao encontrada/);
  global.fetch = async () => json({}, 403);
  await assert.rejects(api.orderRequest("/usuarios", "GET", undefined, undefined, true), /administrador/);
  global.fetch = async () => { throw new TypeError("offline"); };
  await assert.rejects(api.orderRequest("/ordens-servico"), /conectar/);
  global.fetch = async (_, options) => { if (options.signal.aborted) throw new Error("aborted"); return json({}); };
  const controller = new AbortController(); controller.abort();
  await assert.rejects(api.orderRequest("/ordens-servico", "GET", undefined, controller.signal), /aborted/);
});
