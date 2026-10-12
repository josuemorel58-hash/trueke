import { File } from "expo-file-system";
import * as Crypto from "expo-crypto";
import { supabase, supabaseUrl, supabaseKey } from "../lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { rememberImage } from "./imageCache";
import type { Operation, Records } from "../data/sync";

export async function exchange(
  userId: string,
  operations: Operation[],
): Promise<Records> {
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  if (auth.session?.user.id !== userId)
    throw new Error("Vuelve a iniciar sesión para sincronizar esta cuenta.");
  // Fija el token del lote para que cambiar de cuenta no redirija datos a otro usuario.
  const token = auth.session.access_token;
  const client = createClient(supabaseUrl!, supabaseKey!, {
    accessToken: async () => token,
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(20000),
        }),
    },
  });
  const prepared: Operation[] = [];
  for (const op of operations) {
    let value = op.value;
    if (
      op.key === "profile/photo" &&
      typeof value === "string" &&
      value.startsWith("file:")
    ) {
      const file = new File(value);
      const bytes = await file.bytes();
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        value,
      );
      const extension = value.split(".").pop()?.toLowerCase() || "jpg";
      const contentType =
        extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : extension === "heic"
              ? "image/heic"
              : "image/jpeg";
      const path = `${userId}/${hash}.${extension}`;
      const { error } = await client.storage
        .from("trueke-private")
        .upload(path, bytes, { contentType, upsert: true });
      if (error) throw error;
      value = "storage://" + path;
      await rememberImage("storage://" + path, file.uri);
    }
    prepared.push({ ...op, value });
  }
  const { data, error } = await client
    .rpc("trueke_sync", { operations: prepared })
    .abortSignal(AbortSignal.timeout(20000));
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Respuesta de sincronización inválida.");
  return data as Records;
}
