import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat, type ImageResult, type SaveOptions } from "expo-image-manipulator";
import { File, Paths } from "expo-file-system";

/** Cópia JPEG gerada no cache; `origemUri` é a foto original (nunca excluída) e é obrigatória para a limpeza segura. */
export type ImagemNota = { uri: string; origemUri: string; name: "nota-fiscal.jpg"; type: "image/jpeg"; width: number; height: number };
export type OrigemImagem = "camera" | "galeria";
type ContextoImagem = {
  resize: (size: { width?: number; height?: number }) => unknown;
  renderAsync: () => Promise<{ saveAsync: (options: SaveOptions) => Promise<ImageResult> }>;
};
export type DependenciasImagem = {
  pedirCamera: typeof ImagePicker.requestCameraPermissionsAsync;
  pedirGaleria: typeof ImagePicker.requestMediaLibraryPermissionsAsync;
  abrirCamera: typeof ImagePicker.launchCameraAsync;
  abrirGaleria: typeof ImagePicker.launchImageLibraryAsync;
  manipular: (uri: string) => ContextoImagem;
};
export type ArquivosTemporarios = { cacheUri: () => string; excluir: (uri: string) => void };
const arquivosPadrao: ArquivosTemporarios = {
  cacheUri: () => Paths.cache.uri,
  excluir: (uri) => new File(uri).delete(),
};
const padrao: DependenciasImagem = {
  pedirCamera: ImagePicker.requestCameraPermissionsAsync,
  pedirGaleria: ImagePicker.requestMediaLibraryPermissionsAsync,
  abrirCamera: ImagePicker.launchCameraAsync,
  abrirGaleria: ImagePicker.launchImageLibraryAsync,
  manipular: (uri) => ImageManipulator.manipulate(uri),
};

export class ErroImagemNota extends Error {
  constructor(readonly tipo: "PERMISSAO" | "IMAGEM" | "PROCESSAMENTO" | "LIMPEZA",
    readonly motivo: "CAMINHO" | "EXCLUSAO" | null = null) {
    super(tipo === "PERMISSAO" ? "Permissão de acesso à imagem negada." :
      tipo === "IMAGEM" ? "Selecione apenas uma foto válida." :
        tipo === "LIMPEZA" ? motivo === "CAMINHO" ? "Cópia temporária fora do cache seguro; nenhuma exclusão foi realizada." :
          "Não foi possível apagar a cópia temporária. Verifique o armazenamento." : "Não foi possível preparar a imagem.");
    this.name = "ErroImagemNota";
  }
}

const URI_LOCAL = /^file:\/\/\/\S+$/i;
const NOME_GERADO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/i;

function imagemGerada(valor: unknown): valor is ImagemNota {
  if (valor === null || typeof valor !== "object") return false;
  const uri: unknown = Reflect.get(valor, "uri");
  const origemUri: unknown = Reflect.get(valor, "origemUri");
  return typeof uri === "string" && typeof origemUri === "string" && URI_LOCAL.test(origemUri) &&
    Reflect.get(valor, "name") === "nota-fiscal.jpg" && Reflect.get(valor, "type") === "image/jpeg";
}

function arquivoGeradoSeguro(imagem: unknown, cacheUri: string): imagem is ImagemNota {
  const base = cacheUri.replace(/\/+$/, "");
  if (!imagemGerada(imagem) || !URI_LOCAL.test(base) || imagem.uri.toLowerCase() === imagem.origemUri.toLowerCase()) return false;
  const prefixo = `${base}/ImageManipulator/`;
  return imagem.uri.startsWith(prefixo) && NOME_GERADO.test(imagem.uri.slice(prefixo.length));
}

/**
 * Apaga somente a cópia JPEG gerada pelo ImageManipulator no cache da aplicação (iOS `Library/Caches` ou Android `cache`).
 * Entrada `unknown`: valores forjados ou sem `origemUri` são recusados. Retorna `void` somente após `excluir` concluir;
 * lança `ErroImagemNota("LIMPEZA", "CAMINHO")` quando nada foi excluído por insegurança e `("LIMPEZA", "EXCLUSAO")` se a exclusão falhar.
 */
export function descartarImagemTemporaria(imagem: unknown, arquivos: ArquivosTemporarios = arquivosPadrao): void {
  try {
    if (!arquivoGeradoSeguro(imagem, arquivos.cacheUri())) throw new ErroImagemNota("LIMPEZA", "CAMINHO");
    arquivos.excluir(imagem.uri);
  } catch (erro) {
    if (erro instanceof ErroImagemNota) throw erro;
    throw new ErroImagemNota("LIMPEZA", "EXCLUSAO");
  }
}

async function permissao(origem: OrigemImagem, deps: DependenciasImagem): Promise<boolean> {
  const resposta = origem === "camera" ? await deps.pedirCamera() : await deps.pedirGaleria();
  return resposta.granted;
}

export async function selecionarImagem(origem: OrigemImagem, deps: DependenciasImagem = padrao,
  arquivos: ArquivosTemporarios = arquivosPadrao): Promise<ImagemNota | null> {
  if (origem !== "camera" && origem !== "galeria") throw new ErroImagemNota("IMAGEM");
  try {
    if (!await permissao(origem, deps)) throw new ErroImagemNota("PERMISSAO");
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"], allowsMultipleSelection: false, allowsEditing: false,
      exif: false, base64: false, quality: 1,
    };
    const resultado = origem === "camera" ? await deps.abrirCamera(options) : await deps.abrirGaleria(options);
    if (resultado.canceled) return null;
    if (resultado.assets.length !== 1) throw new ErroImagemNota("IMAGEM");
    const [asset] = resultado.assets;
    if (!asset.uri || !/^file:\/\/\S+$/i.test(asset.uri) || asset.type !== "image" ||
      !Number.isSafeInteger(asset.width) || asset.width <= 0 || !Number.isSafeInteger(asset.height) || asset.height <= 0) {
      throw new ErroImagemNota("IMAGEM");
    }
    const contexto = deps.manipular(asset.uri);
    const maior = Math.max(asset.width, asset.height);
    if (maior > 2048) contexto.resize(asset.width >= asset.height ? { width: 2048 } : { height: 2048 });
    const imagem = await (await contexto.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: false });
    const copia: ImagemNota = { uri: imagem.uri, width: imagem.width, height: imagem.height,
      name: "nota-fiscal.jpg", type: "image/jpeg", origemUri: asset.uri };
    if (!/^file:\/\/\S+$/i.test(imagem.uri) || !Number.isSafeInteger(imagem.width) || imagem.width <= 0 ||
      !Number.isSafeInteger(imagem.height) || imagem.height <= 0) {
      descartarImagemTemporaria(copia, arquivos);
      throw new ErroImagemNota("PROCESSAMENTO");
    }
    if (!arquivoGeradoSeguro(copia, arquivos.cacheUri())) throw new ErroImagemNota("LIMPEZA", "CAMINHO");
    return copia;
  } catch (erro) {
    if (erro instanceof ErroImagemNota) throw erro;
    throw new ErroImagemNota("PROCESSAMENTO");
  }
}
