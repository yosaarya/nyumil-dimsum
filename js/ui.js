// js/ui.js — helper render, toast, modal, sheet.

export function toast(pesan, durasiMs = 2500) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = pesan;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), durasiMs);
}

export function bukaSheet(kontenEl) {
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.appendChild(kontenEl);
  overlay.appendChild(sheet);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
  return overlay;
}

/** Sembunyikan bar atas + tab bar global untuk layar penuh (Cek Pesanan, Pembayaran). */
export function sembunyikanShell() {
  document.getElementById('bar-atas').hidden = true;
  document.getElementById('tab-bar').hidden = true;
}

export function tampilkanShell() {
  document.getElementById('bar-atas').hidden = false;
  document.getElementById('tab-bar').hidden = false;
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}
