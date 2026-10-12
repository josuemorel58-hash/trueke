import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";
import { supabase } from "../lib/supabase";
const tasks = new Map<string, Promise<string>>();
async function pathFor(uri: string) {
  if (!FileSystem.documentDirectory) throw new Error("Sin almacenamiento");
  const directory = FileSystem.documentDirectory + "trueke-images/";
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    uri,
  );
  return directory + hash + ".img";
}
export async function rememberImage(uri: string, local: string) {
  const path = await pathFor(uri);
  if (!(await FileSystem.getInfoAsync(path)).exists)
    await FileSystem.copyAsync({ from: local, to: path });
}
export function cachedImage(uri: string): Promise<string> {
  if (!uri || uri.startsWith("file:")) return Promise.resolve(uri);
  if (tasks.has(uri)) return tasks.get(uri)!;
  const task = (async () => {
    const path = await pathFor(uri);
    if ((await FileSystem.getInfoAsync(path)).exists) return path;
    let url = uri;
    if (uri.startsWith("storage://")) {
      const { data, error } = await supabase.storage
        .from("trueke-private")
        .createSignedUrl(uri.slice(10), 120);
      if (error) throw error;
      url = data.signedUrl;
    }
    if (!url.startsWith("https://")) throw new Error("Imagen no disponible");
    const temporary = path + ".download";
    try {
      const result = await FileSystem.downloadAsync(url, temporary);
      if (result.status !== 200) throw new Error("Descarga fallida");
      await FileSystem.moveAsync({ from: temporary, to: path });
      return path;
    } finally {
      await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(
        () => {},
      );
    }
  })();
  tasks.set(uri, task);
  void task.finally(() => tasks.delete(uri)).catch(() => {});
  return task;
}
