import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const LADO = 400; // px — suficiente para o maior avatar (88pt em telas 3x ≈ 264px)

/**
 * Abre a galeria nativa com recorte quadrado e devolve a foto já reduzida
 * como data URI JPEG (~30–60 KB), pronta para salvar no backend.
 * Retorna null se a pessoa cancelar.
 */
export async function escolherFotoDaGaleria(): Promise<string | null> {
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (resultado.canceled || !resultado.assets?.length) return null;

  const { uri, width, height } = resultado.assets[0];
  const contexto = ImageManipulator.manipulate(uri);
  // reduz pelo menor lado mantendo a proporção (no web não há recorte; o avatar recorta no círculo)
  contexto.resize(width >= height ? { height: Math.min(LADO, height) } : { width: Math.min(LADO, width) });
  const imagem = await contexto.renderAsync();
  const salva = await imagem.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!salva.base64) throw new Error("Não foi possível processar a imagem selecionada.");
  return `data:image/jpeg;base64,${salva.base64}`;
}
