// js/auth.js — layar login sederhana (F-12: 2 akun, PEMILIK & ADMIN).
import { supabase } from './api.js';
import { el } from './ui.js';

export function renderLogin(container) {
  container.innerHTML = '';

  const inputEmail = el('input', {
    type: 'email', placeholder: 'Email', autocomplete: 'username', class: 'input-login',
  });
  const inputSandi = el('input', {
    type: 'password', placeholder: 'Kata sandi', autocomplete: 'current-password', class: 'input-login',
  });
  const pesanGalat = el('div', { class: 'login-pesan' });
  const tombolMasuk = el('button', { class: 'btn btn--utama login-tombol' }, 'Masuk');

  async function coba_masuk() {
    pesanGalat.textContent = '';
    tombolMasuk.disabled = true;
    tombolMasuk.textContent = 'Masuk...';

    const { error } = await supabase.auth.signInWithPassword({
      email: inputEmail.value.trim(),
      password: inputSandi.value,
    });

    tombolMasuk.disabled = false;
    tombolMasuk.textContent = 'Masuk';

    if (error) {
      pesanGalat.textContent = 'Email atau kata sandi salah. Coba lagi.';
    }
    // kalau sukses, onAuthStateChange di app.js yang menampilkan aplikasinya
  }

  tombolMasuk.addEventListener('click', coba_masuk);
  inputSandi.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') coba_masuk();
  });

  container.appendChild(
    el('div', { class: 'login-bungkus' }, [
      el('div', { class: 'login-kartu' }, [
        el('div', { class: 'login-judul' }, 'Nyumil Dimsum'),
        el('div', { class: 'login-sub' }, 'Masuk untuk mulai bekerja'),
        inputEmail,
        inputSandi,
        pesanGalat,
        tombolMasuk,
      ]),
    ])
  );

  inputEmail.focus();
}

export async function keluar() {
  if (confirm('Keluar dari aplikasi?')) {
    await supabase.auth.signOut();
  }
}
