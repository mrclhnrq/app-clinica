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
// as telas usam as cores do tema do app (src/constants/theme.ts)
const theme = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(path.join(__dirname, "../src/constants/theme.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, theme);
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; api.setOrdersTokenProvider(() => "session"); });
const relations = {
  clients: [{ id: 1, nomeCompleto: "Cliente real" }], users: [{ id: 8, nome: "Responsável" }],
  catalog: [{ idProdutoServico: 3, nome: "Serviço", produto: false, ativo: true, valorVenda: 125.5 }, { idProdutoServico: 4, nome: "Produto", produto: true, ativo: true, valorVenda: 32.9 }],
  combos: [{ idCombo: 2, nome: "Combo", ativo: true, valorFinal: 180 }],
};
const items = [{ servicoProdutoId: 3, quantidade: 1, desconto: 0 }, { produtoId: 4, quantidade: 2, desconto: 0 }];
const schedule = { dt_hora: "2026-11-05T14:30:00", retorno: false };
const original = { id: 10, clienteId: 1, usuarioId: 8, valorFinal: 170, dataCriacao: "2026-10-24", observacao: "", itens: items, ...schedule, status: "PENDENTE" };
const payload = (changes = {}) => api.orderPayload(changes.client ?? 1, changes.user ?? 8, changes.notes ?? "  Observação  ", changes.items ?? items, changes.relations ?? relations, changes.original, changes.schedule ?? schedule);
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

test("payload uses usuarioId, correct item relationships and currency rounding", () => {
  const result = payload();
  assert.equal(result.valorFinal, 191.3);
  assert.equal(result.usuarioId, 8);
  assert.equal(result.observacao, "Observação");
  assert.equal(result.itens[1].produtoId, 4);
  assert.equal(result.itens[1].ehProduto, true);
  assert.equal(result.itens[0].nomeServicoProduto, "Serviço");
  assert.deepEqual(Object.keys(result).sort(), ["clienteId", "dt_hora", "itens", "observacao", "retorno", "status", "usuarioId", "valorFinal"]);
  assert.equal(result.dt_hora, schedule.dt_hora);
  assert.equal(result.status, "PENDENTE");
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
  const unauthenticated = await api.loadOrderRelations();
  assert.equal(unauthenticated.clients.length, 0);
  assert.match(api.orderRelationsError(unauthenticated), /token/);
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

test("requires and preserves local appointment date/time without UTC conversion", () => {
  assert.equal(api.orderSchedule("05/11/2026 14:30", false).dt_hora, "2026-11-05T14:30:00");
  assert.equal(api.orderSchedule("29/02/2028 00:00", false).dt_hora, "2028-02-29T00:00:00");
  for (const value of ["", "05/11/2026", "31/02/2026 14:00", "29/02/2026 14:00", "05/13/2026 14:00", "05/11/2026 24:00", "05/11/2026 14:60", "05/11/0999 14:00"]) {
    assert.throws(() => api.orderSchedule(value, false));
  }
  assert.throws(() => api.orderPayload(1, 8, "", items, relations));
});

test("return creation uses midnight and editing preserves time assigned by a status transition", () => {
  assert.equal(api.orderSchedule("05/11/2026", true).dt_hora, "2026-11-05T00:00:00");
  const returned = { ...original, retorno: true, dt_hora: "2026-11-05T09:45:20", status: "EM_ANDAMENTO" };
  const edited = api.orderSchedule("05/11/2026", true, returned);
  assert.equal(edited.dt_hora, "2026-11-05T09:45:20");
  assert.throws(() => api.orderSchedule("06/11/2026", true, returned));
  assert.throws(() => api.orderSchedule("05/11/2026 10:00", false, returned));
  assert.throws(() => api.orderSchedule("05/11/2026", true, original));
  assert.equal(payload({ original: returned, schedule: edited }).status, "EM_ANDAMENTO");
});

test("status updates use PATCH and include return time only when explicitly supplied", async () => {
  const calls = [];
  global.fetch = async (url, options) => { calls.push({ url, options }); return json(original); };
  await api.updateOrderStatus(10, "EM_ANDAMENTO");
  await api.updateOrderStatus(10, "CANCELADA", "2026-11-05T09:45:00");
  assert.equal(calls[0].url, "http://orders.test/ordens-servico/10/status");
  assert.equal(calls[0].options.method, "PATCH");
  assert.deepEqual(JSON.parse(calls[0].options.body), { status: "EM_ANDAMENTO" });
  assert.deepEqual(JSON.parse(calls[1].options.body), { status: "CANCELADA", dt_hora: "2026-11-05T09:45:00" });
});

test("a failed catalog does not discard clients and responsible users", async () => {
  api.setOrdersTokenProvider(() => "session");
  global.fetch = async url => url.endsWith("/cliente") ? json(relations.clients)
    : url.endsWith("/usuarios") ? json(relations.users)
    : url.includes("/servico-produto") ? json(relations.catalog) : json({}, 500);
  const loaded = await api.loadOrderRelations();
  assert.equal(loaded.clients[0].id, 1);
  assert.equal(loaded.users[0].id, 8);
  assert.equal(loaded.catalog.length, 2);
  assert.equal(loaded.combos.length, 0);
  assert.match(api.orderRelationsError(loaded), /Combos:/);
  assert.equal(payload({ original, relations: loaded }).usuarioId, 8);
});

test("editing preserves original relationships and total during catalog outages, without accepting unverified replacements", () => {
  const unavailable = { clients: [], users: [], catalog: [], combos: [] };
  const result = payload({ original, relations: unavailable });
  assert.equal(result.clienteId, 1);
  assert.equal(result.usuarioId, 8);
  assert.equal(result.valorFinal, 170);
  assert.throws(() => payload({ original, relations: unavailable, client: 9 }));
  assert.throws(() => payload({ original, relations: unavailable, user: 9 }));
  assert.throws(() => payload({ relations: unavailable }));
  assert.throws(() => payload({ original, relations: unavailable, items: [{ ...items[0], quantidade: 4 }] }));
});

test("an edit form with a catalog error still submits valid original order data and blocks double clicks", async () => {
  const screenSource = readFileSync(path.join(__dirname, "../src/app/(autenticado)/ordens.tsx"), "utf8") + "\nexport { OrderForm };";
  const screenJs = ts.transpileModule(screenSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  const screen = { exports: {}, require: name => {
    if (name === "react/jsx-runtime") return require(name);
    if (name === "react") return { useState: initial => [typeof initial === "function" ? initial() : initial, () => {}], useRef: current => ({ current }) };
    if (name === "react-native") return { Platform: { OS: "web", select: options => options.web }, StyleSheet: { create: value => value }, View: "View", Text: "Text", TextInput: "TextInput", Pressable: "Pressable", ScrollView: "ScrollView", KeyboardAvoidingView: "KeyboardAvoidingView" };
    if (name.endsWith("/services/ordens")) return api;
    if (name.endsWith("/constants/theme")) return theme.exports;
    return {};
  } };
  vm.runInNewContext(screenJs.outputText, screen);
  let received, calls = 0, finish;
  const saving = new Promise(resolve => { finish = resolve; });
  const tree = screen.exports.OrderForm({ original, relations: { clients: [], users: [], catalog: [], combos: [] }, busy: false, error: "Catálogo indisponível", onClose: () => {}, onRetry: () => {}, onSave: async value => { calls++; received = value; await saving; } });
  function findSave(node) {
    if (!node || typeof node !== "object") return null;
    if (node.type === "Pressable" && node.props.children?.props?.children === "Salvar Ordem") return node;
    for (const child of [node.props?.children].flat(Infinity)) { const found = findSave(child); if (found) return found; }
    return null;
  }
  const button = findSave(tree);
  assert.ok(button);
  assert.equal(button.props.disabled, false);
  const first = button.props.onPress();
  const second = button.props.onPress();
  assert.equal(calls, 1);
  assert.equal(received.clienteId, 1);
  assert.equal(received.usuarioId, 8);
  finish(); await Promise.all([first, second]);
});

test("editing retrieves linked client and responsible user when list responses omit them", async () => {
  api.setOrdersTokenProvider(() => "session");
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/cliente/1")) return json(relations.clients[0]);
    if (url.endsWith("/usuarios/8")) return json(relations.users[0]);
    return new Response(null, { status: 204 });
  };
  const loaded = await api.loadOrderRelations(undefined, original);
  assert.equal(loaded.clients[0].nomeCompleto, "Cliente real");
  assert.equal(loaded.users[0].nome, "Responsável");
  assert.equal(calls.filter(call => /\/(cliente\/1|usuarios\/8)$/.test(call.url)).length, 2);
  for (const call of calls) assert.equal(call.options.headers.Authorization, "Bearer session");
  assert.equal(api.orderRelationsError(loaded), "");
});

test("a missing linked client is reported without discarding the responsible user", async () => {
  api.setOrdersTokenProvider(() => "session");
  global.fetch = async url => url.endsWith("/cliente/1") ? json({ erro: "Cliente não encontrado" }, 404)
    : url.endsWith("/usuarios/8") ? json(relations.users[0]) : new Response(null, { status: 204 });
  const loaded = await api.loadOrderRelations(undefined, original);
  assert.equal(loaded.users[0].id, 8);
  assert.equal(loaded.clients.length, 0);
  assert.match(api.orderRelationsError(loaded), /Cliente não encontrado/);
});

test("saving from an edit screen issues PUT even while the general list is loading", async () => {
  api.setOrdersTokenProvider(() => "session");
  const source = readFileSync(path.join(__dirname, "../src/app/(autenticado)/ordens.tsx"), "utf8") + "\nexport { OrderForm };";
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  const initial = ["edit", original, "", [original], relations, true, "", "", false];
  let stateIndex = 0;
  const messages = [], writes = [];
  const screen = { exports: {}, window: { alert: message => messages.push(message) }, require: name => {
    if (name === "react/jsx-runtime") return require(name);
    if (name === "react") return {
      useState: fallback => [stateIndex < initial.length ? initial[stateIndex++] : typeof fallback === "function" ? fallback() : fallback, () => {}],
      useRef: current => ({ current }), useCallback: callback => callback,
    };
    if (name === "expo-router") return { useFocusEffect: () => {} };
    if (name === "react-native") return { Platform: { OS: "web", select: options => options.web }, StyleSheet: { create: value => value }, View: "View", Text: "Text", TextInput: "TextInput", Pressable: "Pressable", ScrollView: "ScrollView", KeyboardAvoidingView: "KeyboardAvoidingView" };
    if (name.endsWith("/services/ordens")) return api;
    if (name.endsWith("/constants/theme")) return theme.exports;
    return {};
  } };
  vm.runInNewContext(compiled.outputText, screen);
  function find(node, match) {
    if (!node || typeof node !== "object") return null;
    if (match(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, match); if (found) return found; }
    return null;
  }
  const parent = screen.exports.default();
  const form = find(parent, node => node.type === screen.exports.OrderForm);
  assert.ok(form);
  assert.equal(form.props.busy, false);
  const button = find(form.type(form.props), node => node.type === "Pressable" && node.props.children?.props?.children === "Salvar Ordem");
  assert.ok(button);
  assert.equal(button.props.disabled, false);
  global.fetch = async (url, options) => {
    if (options.method === "PUT") { writes.push({ url, body: JSON.parse(options.body) }); return json(original); }
    if (url.includes("/ordens-servico?")) return json({ content: [original], totalPages: 1 });
    return json(url.endsWith("/cliente") ? relations.clients : url.endsWith("/usuarios") ? relations.users : []);
  };
  await button.props.onPress();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].url, "http://orders.test/ordens-servico/10");
  assert.equal(writes[0].body.clienteId, 1);
  assert.equal(writes[0].body.usuarioId, 8);
  assert.match(messages[0], /salva com sucesso/);
});
