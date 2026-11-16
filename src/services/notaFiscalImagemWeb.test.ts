import { expect, jest, test } from "@jest/globals";
import { PermissionStatus, type ImagePickerAsset } from "expo-image-picker";
import { descartarImagemTemporaria, selecionarImagem, type DependenciasImagem } from "./notaFiscalImagem";

jest.mock("expo-image-picker", () => ({ PermissionStatus: { GRANTED: "granted", DENIED: "denied" } }));
jest.mock("expo-image-manipulator", () => ({ SaveFormat: { JPEG: "jpeg" }, ImageManipulator: { manipulate: jest.fn() } }));
jest.mock("expo-file-system", () => ({ Paths: { cache: { uri: "file:///cache/" } }, File: jest.fn() }));

const foto: ImagePickerAsset = { uri: "blob:http://localhost:8081/1234-abcd", type: "image", width: 3200, height: 1600 };

function ambienteWeb() {
  const manipular = jest.fn<DependenciasImagem["manipular"]>();
  const deps: DependenciasImagem = {
    pedirCamera: async () => ({ granted: true, status: PermissionStatus.GRANTED, canAskAgain: true, expires: "never" }),
    pedirGaleria: async () => ({ granted: true, status: PermissionStatus.GRANTED, canAskAgain: true, expires: "never" }),
    abrirCamera: async () => ({ canceled: false, assets: [foto] }),
    abrirGaleria: async () => ({ canceled: false, assets: [foto] }),
    manipular,
    ehWeb: true,
  };
  return { deps, manipular };
}

test("web aceita o blob selecionado sem usar ImageManipulator (módulo nativo)", async () => {
  const { deps, manipular } = ambienteWeb();
  expect(await selecionarImagem("galeria", deps)).toEqual({
    uri: foto.uri, origemUri: foto.uri, name: "nota-fiscal.jpg", type: "image/jpeg", width: 3200, height: 1600,
  });
  expect(manipular).not.toHaveBeenCalled();
});

test("web recusa URI que não seja blob", async () => {
  const { deps } = ambienteWeb();
  await expect(selecionarImagem("galeria", { ...deps, abrirGaleria: async () => ({ canceled: false, assets: [{ ...foto, uri: "file:///cache/x.jpg" }] }) }))
    .rejects.toMatchObject({ tipo: "IMAGEM" });
});

test("descartar no web revoga o blob e não toca o cache de arquivos", async () => {
  const { deps } = ambienteWeb();
  const copia = await selecionarImagem("galeria", deps);
  const revogar = jest.fn<(url: string) => void>();
  const original = URL.revokeObjectURL;
  URL.revokeObjectURL = revogar;
  try {
    const excluir = jest.fn<(uri: string) => void>();
    descartarImagemTemporaria(copia, { cacheUri: () => "file:///cache/", excluir });
    expect(revogar).toHaveBeenCalledWith(foto.uri);
    expect(excluir).not.toHaveBeenCalled();
  } finally {
    URL.revokeObjectURL = original;
  }
});
