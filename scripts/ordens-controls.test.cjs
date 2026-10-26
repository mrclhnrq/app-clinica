const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function compile(source) {
  return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
}
function component(file, name, props) {
  const states = [];
  let cursor = 0;
  const api = { exports: {}, process: { env: {} } };
  vm.runInNewContext(compile(readFileSync(path.join(__dirname, "../src/services/ordens.ts"), "utf8")), api);
  // as telas usam as cores do tema do app (src/constants/theme.ts)
  const theme = { exports: {} };
  vm.runInNewContext(compile(readFileSync(path.join(__dirname, "../src/constants/theme.ts"), "utf8")), theme);
  const context = { exports: {}, require: module => {
    if (module === "react/jsx-runtime") return require(module);
    if (module === "react") return {
      useState: initial => {
        const index = cursor++;
        if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
        return [states[index], value => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
      }, useRef: current => ({ current }),
    };
    if (module === "react-native") return {
      Platform: { OS: "web", select: options => options.web }, StyleSheet: { create: styles => styles },
      Modal: "Modal", Pressable: "Pressable", ScrollView: "ScrollView", View: "View", Text: "Text", TextInput: "TextInput", KeyboardAvoidingView: "KeyboardAvoidingView",
    };
    if (module.endsWith("/services/ordens")) return api.exports;
    if (module.endsWith("/constants/theme")) return theme.exports;
    return {};
  } };
  vm.runInNewContext(compile(readFileSync(path.join(__dirname, "../", file), "utf8") + `\nexport { ${name} };`), context);
  return () => { cursor = 0; return context.exports[name](props); };
}
function find(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const result = find(child, predicate); if (result) return result; }
  return null;
}
const labelled = (tree, label) => find(tree, node => node.props?.accessibilityLabel === label);
const button = (tree, label) => find(tree, node => node.type === "Pressable" && node.props.children?.props?.children === label);

test("calendar selects a date and 24-hour time and confirms the form value", () => {
  let value, closed = false;
  const render = component("src/components/ordens/OrderDateTimePicker.tsx", "OrderDateTimePicker", {
    value: "05/11/2026 14:30:00", dateOnly: false, onConfirm: selected => { value = selected; }, onClose: () => { closed = true; },
  });
  labelled(render(), "06/11/2026").props.onPress();
  labelled(render(), "Hora").props.onChangeText("18");
  labelled(render(), "Minutos").props.onChangeText("45");
  button(render(), "Confirmar").props.onPress();
  assert.equal(value, "06/11/2026 18:45");
  assert.equal(closed, true);
});

test("calendar rejects invalid hours and allows closing without confirming", () => {
  let confirmed = false, closed = false;
  const render = component("src/components/ordens/OrderDateTimePicker.tsx", "OrderDateTimePicker", {
    value: "05/11/2026 14:30", dateOnly: false, onConfirm: () => { confirmed = true; }, onClose: () => { closed = true; },
  });
  labelled(render(), "Hora").props.onChangeText("24");
  assert.equal(button(render(), "Confirmar").props.disabled, true);
  button(render(), "Confirmar").props.onPress();
  assert.equal(confirmed, false);
  button(render(), "Cancelar").props.onPress();
  assert.equal(closed, true);
});

test("return calendar shows dates without time fields and navigates months", () => {
  let value;
  const render = component("src/components/ordens/OrderDateTimePicker.tsx", "OrderDateTimePicker", {
    value: "05/11/2026", dateOnly: true, onConfirm: selected => { value = selected; }, onClose: () => {},
  });
  assert.equal(labelled(render(), "Hora"), null);
  labelled(render(), "Próximo mês").props.onPress();
  labelled(render(), "07/12/2026").props.onPress();
  button(render(), "Confirmar").props.onPress();
  assert.equal(value, "07/12/2026");
});

test("client selector expands in its field and choosing an option closes the list", () => {
  const render = component("src/app/(autenticado)/ordens.tsx", "OrderForm", {
    relations: { clients: [{ id: 1, nomeCompleto: "Ana Souza" }], users: [], catalog: [], combos: [] },
    busy: false, error: "", onRetry: () => {}, onSave: async () => {}, onClose: () => {},
  });
  labelled(render(), "Selecione o cliente").props.onPress();
  assert.equal(labelled(render(), "Selecione o cliente").props.accessibilityState.expanded, true);
  const option = find(render(), node => node.type === "Pressable" && node.props.children?.[0]?.props?.children === "Ana Souza");
  assert.ok(option);
  option.props.onPress();
  const field = labelled(render(), "Selecione o cliente");
  assert.equal(field.props.accessibilityState.expanded, false);
  assert.equal(field.props.children[0].props.children, "Ana Souza");
});
