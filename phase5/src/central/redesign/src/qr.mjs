const VALID_FORMATS = new Set(['png', 'svg']);
const VALID_LEVELS = new Set(['L', 'M', 'Q', 'H']);
export async function renderQr(input) {
  const text = String(input.text ?? '');
  if (!text || text.length > 2400) { const error = new Error('Konten QR harus 1–2400 karakter'); error.status = 400; throw error; }
  const format = String(input.format || 'png').toLowerCase();
  if (!VALID_FORMATS.has(format)) { const error = new Error('Format harus png atau svg'); error.status = 400; throw error; }
  const level = String(input.level || 'M').toUpperCase();
  if (!VALID_LEVELS.has(level)) { const error = new Error('Level koreksi QR tidak valid'); error.status = 400; throw error; }
  const width = Math.min(1000, Math.max(160, Number(input.width) || 360));
  const isHex = value => /^#[0-9a-fA-F]{6}$/.test(value);
  const dark = isHex(input.dark) ? input.dark : '#122033';
  const light = isHex(input.light) ? input.light : '#ffffff';
  const { default: QRCode } = await import('qrcode');
  const options = { errorCorrectionLevel: level, margin: 4, width, color: { dark, light } };
  try {
    if (format === 'svg') {
      return { data: await QRCode.toString(text, { ...options, type: 'svg' }), type: 'image/svg+xml; charset=utf-8', ext: 'svg' };
    }
    const dataUrl = await QRCode.toDataURL(text, { ...options, type: 'image/png' });
    return { data: Buffer.from(dataUrl.split(',')[1], 'base64'), type: 'image/png', ext: 'png' };
  } catch {
    const err = new Error('Konten QR terlalu besar atau tidak dapat diproses'); err.status = 400; throw err;
  }
}
