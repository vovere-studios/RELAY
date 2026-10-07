import { requireSupabase } from "./supabase";
import type { Json, Database } from "./database.types";
export type Row<K extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][K]["Row"];
export type Member = {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "admin" | "member";
};
export type SharedDocument = {
  id: string;
  document_id: string;
  shared_at: string;
  name: string;
  kind: string;
  mime_type: string;
  storage_path: string;
  sender_name: string;
};
export type SafeInvite = Omit<Row<"team_invitations">, "token_hash">;
export type SafeUploadLink = Omit<Row<"upload_links">, "token_hash">;
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "Please try again.";
}
export async function workspaceAction<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, Json | undefined> = {},
) {
  const { data, error } = await requireSupabase().rpc("relay_workspace_api", {
    action,
    payload,
  });
  if (error) throw error;
  return data as T;
}
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
export function privateLink(path: "submit" | "join", token: string) {
  return `${location.origin}/${path}#token=${encodeURIComponent(token)}`;
}
export async function downloadPrivate(path: string, name: string) {
  const { data, error } = await requireSupabase()
    .storage.from("relay-documents")
    .download(path, { cacheNonce: crypto.randomUUID() }, { cache: "no-store" });
  if (error) throw error;
  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
