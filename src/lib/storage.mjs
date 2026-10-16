const PREFIX = 'pov-studio:v1:';
export function readStored(key, fallback) {
  try { const raw = localStorage.getItem(PREFIX + key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
export function writeStored(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
  catch { return false; }
}
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export function downloadJSON(value, name) { downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }), name); }
export function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return reject(new Error('Use a PNG, JPG, or WebP image.'));
    if (file.size > 650000) return reject(new Error('Images must be under 650 KB for browser storage.'));
    const reader = new FileReader(); reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.onload = () => { const img = new Image(); img.onload = () => resolve(reader.result); img.onerror = () => reject(new Error('The image file is damaged or invalid.')); img.src = reader.result; }; reader.readAsDataURL(file);
  });
}

// This database was used exclusively by the removed GLB feature. Photos,
// Brand Kit and ad history live separately and are preserved.
export function clearRetiredModelStorage() {
  if (!globalThis.indexedDB) return;
  try { const request = indexedDB.deleteDatabase('pov-studio-assets-v1'); request.onerror = () => {}; } catch {}
}
