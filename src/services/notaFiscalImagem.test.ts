import { expect, jest, test } from "@jest/globals";
import { PermissionStatus, type ImagePickerAsset } from "expo-image-picker";
import { descartarImagemTemporaria, selecionarImagem, type ArquivosTemporarios, type DependenciasImagem, type ImagemNota } from "./notaFiscalImagem";

jest.mock("expo-image-picker", () => ({ PermissionStatus: { GRANTED: "granted", DENIED: "denied" } }));
jest.mock("expo-image-manipulator", () => ({ SaveFormat: { JPEG: "jpeg" }, ImageManipulator: { manipulate: jest.fn() } }));
jest.mock("expo-file-system", () => ({ Paths: { cache: { uri: "file:///cache/" } }, File: jest.fn() }));

const foto: ImagePickerAsset = { uri: "file:///cache/entrada.png", type: "image", width: 3200, height: 1600 };
const uriGerada = "file:///cache/ImageManipulator/00000000-0000-4000-8000-000000000001.jpg";

function arquivos() {
  const excluir = jest.fn<(uri: string) => void>();
  const deps: ArquivosTemporarios = { cacheUri: () => "file:///cache/", excluir };
  return { deps, excluir };
}

function ambiente() {
  const resize = jest.fn();
  const saveAsync = jest.fn<(options: { format?: "jpeg" | "png" | "webp"; compress?: number; base64?: boolean }) => Promise<{ uri: string; width: number; height: number }>>()
    .mockResolvedValue({ uri: uriGerada, width: 2048, height: 1024 });
  const manipular = jest.fn<DependenciasImagem["manipular"]>(() => ({
    resize, renderAsync: async () => ({ saveAsync }),
  }));
  const deps: DependenciasImagem = {
    pedirCamera: async () => ({ granted: true, status: PermissionStatus.GRANTED, canAskAgain: true, expires: "never" }),
    pedirGaleria: async () => ({ granted: true, status: PermissionStatus.GRANTED, canAskAgain: true, expires: "never" }),
    abrirCamera: async () => ({ canceled: false, assets: [foto] }),
    abrirGaleria: async () => ({ canceled: false, assets: [foto] }),
    manipular,
  };
  return { deps, resize, saveAsync, manipular };
}

test("galeria reduz imagem e salva JPEG com metadata consistente, sem EXIF", async () => {
  const { deps, resize, saveAsync } = ambiente();
  const abrirGaleria = jest.fn(deps.abrirGaleria);
  expect(await selecionarImagem("galeria", { ...deps, abrirGaleria })).toEqual({
    uri: uriGerada, width: 2048, height: 1024, name: "nota-fiscal.jpg", type: "image/jpeg", origemUri: foto.uri,
  });
  expect(resize).toHaveBeenCalledWith({ width: 2048 });
  expect(saveAsync).toHaveBeenCalledWith({ format: "jpeg", compress: 0.85, base64: false });
  expect(abrirGaleria).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ["images"], allowsMultipleSelection: false, exif: false, base64: false }));
});

test("permissão negada não abre câmera", async () => {
  const { deps, manipular } = ambiente();
  const abrirCamera = jest.fn(deps.abrirCamera);
  await expect(selecionarImagem("camera", { ...deps, pedirCamera: async () => ({ granted: false, status: PermissionStatus.DENIED, canAskAgain: false, expires: "never" }), abrirCamera })).rejects.toMatchObject({ tipo: "PERMISSAO" });
  expect(abrirCamera).not.toHaveBeenCalled();
  expect(manipular).not.toHaveBeenCalled();
});

test("cancelamento e seleção múltipla não manipulam nem enviam", async () => {
  const { deps, manipular } = ambiente();
  await expect(selecionarImagem("camera", { ...deps, abrirCamera: async () => ({ canceled: true, assets: null }) })).resolves.toBeNull();
  await expect(selecionarImagem("camera", { ...deps, abrirCamera: async () => ({ canceled: false, assets: [foto, foto] }) })).rejects.toMatchObject({ tipo: "IMAGEM" });
  expect(manipular).not.toHaveBeenCalled();
});

test("foto sem URI local ou tipo imagem e falha de conversão não geram JPEG falso", async () => {
  const { deps, manipular } = ambiente();
  await expect(selecionarImagem("galeria", { ...deps, abrirGaleria: async () => ({ canceled: false, assets: [{ ...foto, uri: "https://example.invalid/foto", type: "video" }] }) })).rejects.toMatchObject({ tipo: "IMAGEM" });
  expect(manipular).not.toHaveBeenCalled();
  await expect(selecionarImagem("galeria", { ...deps, manipular: () => { throw new Error("Falha nativa"); } })).rejects.toMatchObject({ tipo: "PROCESSAMENTO" });
});

test("remoção só alcança cópia JPEG gerada no cache; nunca a foto original da galeria", async () => {
  const { deps, excluir } = arquivos();
  const imagem: ImagemNota = { uri: uriGerada, origemUri: foto.uri, name: "nota-fiscal.jpg", type: "image/jpeg", width: 800, height: 600 };
  descartarImagemTemporaria(imagem, deps);
  expect(excluir).toHaveBeenCalledTimes(1);
  expect(excluir).toHaveBeenCalledWith(uriGerada);
  for (const uri of [foto.uri, "file:///cache/ImageManipulator/../entrada.png", "file:///cache/ImageManipulator/%2e%2e/entrada.png",
    "file:///cache/ImageManipulator-falso/00000000-0000-4000-8000-000000000001.jpg",
    "file:///document/ImageManipulator/00000000-0000-4000-8000-000000000001.jpg", "file:///cache/", "https://example.invalid/foto.jpg"]) {
    expect(() => descartarImagemTemporaria({ ...imagem, uri }, deps)).toThrow(expect.objectContaining({ tipo: "LIMPEZA", motivo: "CAMINHO" }));
  }
  expect(() => descartarImagemTemporaria({ ...imagem, origemUri: uriGerada }, deps)).toThrow(expect.objectContaining({ motivo: "CAMINHO" }));
  const forjadas: unknown[] = [null, undefined, "file:///cache/ImageManipulator/x.jpg", 42, {}, { uri: uriGerada },
    { uri: uriGerada, origemUri: 7, name: "nota-fiscal.jpg", type: "image/jpeg" },
    { uri: uriGerada, origemUri: "https://example.invalid/foto.png", name: "nota-fiscal.jpg", type: "image/jpeg" },
    { uri: uriGerada, origemUri: foto.uri, name: "outro.jpg", type: "image/jpeg" },
    { uri: uriGerada, origemUri: foto.uri, name: "nota-fiscal.jpg", type: "image/png" }];
  for (const forjada of forjadas) {
    expect(() => descartarImagemTemporaria(forjada, deps)).toThrow(expect.objectContaining({ tipo: "LIMPEZA", motivo: "CAMINHO" }));
  }
  expect(excluir).toHaveBeenCalledTimes(1);
});

test("cache nativo iOS e Android próprio é aceito; cache de outra raiz não é", () => {
  const nativos = [
    { cache: "file:///var/mobile/Containers/Data/Application/AAAA-1111/Library/Caches/", original: "file:///var/mobile/Containers/Data/Application/AAAA-1111/tmp/foto.png" },
    { cache: "file:///data/user/0/com.exemplo.app/cache/", original: "file:///data/user/0/com.exemplo.app/cache/ImagePicker/foto.png" },
  ];
  for (const { cache, original } of nativos) {
    const excluir = jest.fn<(uri: string) => void>();
    const copia: ImagemNota = { uri: `${cache}ImageManipulator/00000000-0000-4000-8000-000000000009.jpg`, origemUri: original, name: "nota-fiscal.jpg", type: "image/jpeg", width: 8, height: 6 };
    descartarImagemTemporaria(copia, { cacheUri: () => cache.slice(0, -1), excluir });
    expect(excluir).toHaveBeenCalledTimes(1);
    expect(excluir).toHaveBeenCalledWith(copia.uri);
    const outraRaiz = jest.fn<(uri: string) => void>();
    expect(() => descartarImagemTemporaria(copia, { cacheUri: () => "file:///data/user/0/outro.app/cache/", excluir: outraRaiz })).toThrow(expect.objectContaining({ motivo: "CAMINHO" }));
    expect(outraRaiz).not.toHaveBeenCalled();
  }
});

test("falha nativa de exclusão é informada sem revelar URI ou motivo sensível", () => {
  const { deps, excluir } = arquivos();
  excluir.mockImplementation(() => { throw new Error(`falha privada ${uriGerada}`); });
  const imagem: ImagemNota = { uri: uriGerada, origemUri: foto.uri, name: "nota-fiscal.jpg", type: "image/jpeg", width: 800, height: 600 };
  try {
    descartarImagemTemporaria(imagem, deps);
    throw new Error("Exclusão deveria falhar");
  } catch (erro) {
    expect(erro).toMatchObject({ tipo: "LIMPEZA", motivo: "EXCLUSAO" });
    if (!(erro instanceof Error)) throw new Error("Erro de limpeza inesperado");
    expect(erro.message).not.toContain(uriGerada);
  }
  expect(excluir).toHaveBeenCalledTimes(1);
});

test("JPEG salvo com dimensões inválidas é apagado; falha de limpeza bloqueia sucesso", async () => {
  const { deps, saveAsync } = ambiente();
  const { deps: fs, excluir } = arquivos();
  saveAsync.mockResolvedValue({ uri: uriGerada, width: 0, height: 1024 });
  await expect(selecionarImagem("galeria", deps, fs)).rejects.toMatchObject({ tipo: "PROCESSAMENTO" });
  expect(excluir).toHaveBeenCalledTimes(1);
  expect(excluir).toHaveBeenCalledWith(uriGerada);
  excluir.mockImplementation(() => { throw new Error("Falha nativa"); });
  await expect(selecionarImagem("galeria", deps, fs)).rejects.toMatchObject({ tipo: "LIMPEZA", motivo: "EXCLUSAO" });
  expect(excluir).toHaveBeenCalledTimes(2);
});

test("URI pós-save fora do cache não é excluída nem retornada como imagem pronta", async () => {
  const { deps, saveAsync } = ambiente();
  const { deps: fs, excluir } = arquivos();
  saveAsync.mockResolvedValue({ uri: foto.uri, width: 800, height: 600 });
  await expect(selecionarImagem("galeria", deps, fs)).rejects.toMatchObject({ tipo: "LIMPEZA", motivo: "CAMINHO" });
  expect(excluir).not.toHaveBeenCalled();
});
