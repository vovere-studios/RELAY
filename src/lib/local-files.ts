function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("relay-local-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Local file storage is unavailable."));
  });
}
export async function saveLocalFile(id: string, file: File) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(file, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(new Error("The file could not be saved on this device."));
      tx.onabort = () =>
        reject(new Error("Local storage is full or unavailable."));
    });
  } finally {
    db.close();
  }
}
export async function downloadLocalFile(id: string, name: string) {
  const db = await database();
  let file: Blob | undefined;
  try {
    file = await new Promise((resolve, reject) => {
      const request = db
        .transaction("files", "readonly")
        .objectStore("files")
        .get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("The file could not be read."));
    });
  } finally {
    db.close();
  }
  if (!file) throw new Error("This file is no longer stored on this device.");
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
