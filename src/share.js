// View-only links. The whole diagram travels inside the link itself (after the #), squeezed
// with deflate. Nothing is uploaded anywhere, and opening the link shows the diagram with the
// editing tools switched off.

const toB64 = bytes => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

/** Drop everything the loader fills in again by itself, so links stay short. */
function lean(doc) {
  const defaults = { status: 'ok', step: 1, style: 'solid', arrows: 'end', flow: 'normal', packet: 'request' };
  const trim = o => Object.fromEntries(Object.entries(o).filter(([k, v]) => !(v === '' || v == null || v === 0 && (k === 'until' || k === 'bend') || defaults[k] === v)));
  return { name: doc.name, steps: doc.steps, nodes: doc.nodes.map(trim), edges: doc.edges.map(trim), zones: doc.zones.map(trim) };
}

export async function encodeDoc(doc) {
  const raw = new TextEncoder().encode(JSON.stringify(lean(doc)));
  if (typeof CompressionStream === 'undefined') return 'u' + toB64(raw);
  return 'c' + toB64(await pipe(raw, new CompressionStream('deflate-raw')));
}

export async function decodeDoc(code) {
  const bytes = fromB64(code.slice(1));
  const raw = code[0] === 'c' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}

/** A link to this page that opens the diagram view-only. */
export async function shareUrl(doc) {
  return `${location.origin}${location.pathname}#v=${await encodeDoc(doc)}`;
}

/** The diagram carried by the current address, or null if there is none. Throws if it is damaged. */
export async function readShare() {
  const m = /^#v=([cu][A-Za-z0-9_-]+)$/.exec(location.hash);
  return m ? decodeDoc(m[1]) : null;
}

/** True when a link made here only works on this computer. */
export const isLocalOnly = () => /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname) || location.protocol === 'file:';
