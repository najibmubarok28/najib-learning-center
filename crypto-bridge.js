(function (root) {
  'use strict';
  const ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const enc = new TextEncoder();
  const errors = {
    closed: 'Evaluasi sedang ditutup oleh dosen.',
    password: 'Password belum sesuai. Silakan coba lagi.',
    network: 'Akses belum dapat diperiksa. Silakan coba lagi setelah koneksi tersedia.',
    config: 'Evaluasi belum siap digunakan. Hubungi dosen.',
  };
  function fail(code) { const e = new Error(errors[code]); e.code = code; throw e; }
  function toBase64(bytes) {
    let text = '';
    for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(text);
  }
  function fromBase64(text) {
    try { return Uint8Array.from(atob(text), ch => ch.charCodeAt(0)); }
    catch { return fail('config'); }
  }
  function wpOrigin(site) {
    let url;
    try { url = new URL(site); } catch { return fail('config'); }
    if (url.protocol !== 'https:' || !/^[a-z0-9][a-z0-9-]*\.wordpress\.com$/i.test(url.hostname) || url.username || url.password || url.port) fail('config');
    if (url.pathname !== '/' || url.search || url.hash) fail('config');
    return url.origin;
  }
  function validate(meta) {
    if (!meta || !ID.test(meta.id) || meta.postSlug !== 'rb-access-' + meta.id) fail('config');
    return wpOrigin(meta.wordpressSite);
  }
  async function requestJson(url, fetcher) {
    try {
      url.searchParams.set('_rbts', String(Date.now()));
      const response = await fetcher(url.toString(), { credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(12000) });
      if (response.status === 404) fail('closed');
      if (response.status === 401 || response.status === 403) fail('password');
      if (!response.ok) fail('network');
      return await response.json();
    } catch (e) {
      if (e.code) throw e;
      return fail('network');
    }
  }
  async function accessPage(meta, fetcher = fetch) {
    const origin = validate(meta);
    const url = new URL(origin + '/wp-json/wp/v2/pages');
    url.searchParams.set('slug', meta.postSlug);
    url.searchParams.set('_fields', 'id,status,content.protected');
    const data = await requestJson(url, fetcher);
    if (!Array.isArray(data)) fail('config');
    if (!data.length) fail('closed');
    const page = data[0];
    if (page.status !== 'publish') fail('closed');
    if (!Number.isInteger(page.id) || page.id <= 0 || page.content?.protected !== true) fail('config');
    return page;
  }
  async function releaseKey(meta, password, fetcher = fetch) {
    if (typeof password !== 'string' || !password) fail('password');
    const page = await accessPage(meta, fetcher);
    const url = new URL(wpOrigin(meta.wordpressSite) + '/wp-json/wp/v2/pages/' + page.id);
    url.searchParams.set('password', password);
    url.searchParams.set('_fields', 'id,status,content');
    const data = await requestJson(url, fetcher);
    if (data.status !== 'publish') fail('closed');
    if (data.content?.protected !== true) fail('config');
    const match = String(data.content?.rendered || '').match(/RBKEY1\|([a-f0-9-]{36})\|([A-Za-z0-9+/=]{44})\|/i);
    if (!match) fail('password');
    if (match[1].toLowerCase() !== meta.id.toLowerCase()) fail('config');
    const key = fromBase64(match[2]);
    if (key.length !== 32) fail('config');
    return key;
  }
  async function encrypt(html, metadata) {
    validate(metadata);
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode('RB-EVAL-V1|' + metadata.id) }, key, enc.encode(html));
    return {
      envelope: { version: 1, id: metadata.id, title: metadata.title, course: metadata.course, wordpressSite: wpOrigin(metadata.wordpressSite), postSlug: metadata.postSlug, iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(encrypted)) },
      keyMarker: 'RBKEY1|' + metadata.id + '|' + toBase64(keyBytes) + '|',
    };
  }
  async function decrypt(envelope, keyBytes) {
    validate(envelope);
    if (envelope.version !== 1 || keyBytes.length !== 32) fail('config');
    const iv = fromBase64(envelope.iv);
    if (iv.length !== 12) fail('config');
    try {
      const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
      const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: enc.encode('RB-EVAL-V1|' + envelope.id) }, key, fromBase64(envelope.ciphertext));
      return new TextDecoder().decode(data);
    } catch { return fail('config'); }
  }
  async function unlock(envelope, password, fetcher = fetch) {
    return decrypt(envelope, await releaseKey(envelope, password, fetcher));
  }
  const api = { encrypt, decrypt, unlock, accessPage, releaseKey, wpOrigin, validate, errors };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RBBridge = api;
})(typeof window === 'undefined' ? globalThis : window);
