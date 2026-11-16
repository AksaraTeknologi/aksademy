---
name: port-feature
description: Port a change (commit, file, or feature) from aksademy to its sibling platforms (sekolah-pajak, talenta-edu, skill-grow-new, smartcounting-new, biinspira, kompeten, levelupcounting). Use when the user asks to sync, port, apply, or copy a feature/fix from aksademy to other platforms, or asks which platforms a change affects.
---

# Port fitur dari aksademy ke platform turunan

Acuan utama: `docs/platform-map.md`. Baca dulu sebelum mulai.
Semua platform ada di `../<nama>` relatif ke root aksademy, masing-masing repo git terpisah.

## 1. Pahami perubahannya

- Input bisa berupa hash commit, daftar file, atau nama fitur. Kalau hanya nama fitur, cari commit-nya dengan `git log --oneline --grep`.
- Baca diff-nya (`git show <hash>`). Rangkum maksud perubahan dalam 1–2 kalimat.

## 2. Buat rencana porting (jangan edit dulu)

Untuk tiap file yang berubah:
1. Jalankan `scripts/platform-diff.sh <path>` untuk melihat seberapa beda file itu di tiap platform.
2. Tentukan zona dari `docs/platform-map.md` bagian 4: hijau (salin), kuning (patch per hunk), merah (tulis ulang sesuai maksud).
3. Cek fitur platform (bagian 2). Lewati platform yang tidak punya fiturnya, mis. private class, Agent API, meeting link.
4. Kalau menyentuh checkout atau komisi, cek variasi afiliasi (bagian 3) dan gateway platform.

Tampilkan rencana ke user sebagai tabel: platform × file → aksi (salin / patch / tulis ulang / lewati) + alasan singkat. Tunggu persetujuan user.

## 3. Terapkan

- Kerjakan satu platform per giliran. Edit file di `../<platform>/`.
- Ganti identitas brand: prefix invoice, kode afiliasi default, nama brand, warna, teks (bagian 2 peta).
- Jangan menyentuh kode payment gateway atau WA gateway platform tujuan kecuali perubahannya memang tentang itu.
- Frontend `pages/user/*`: port logikanya saja, pertahankan markup dan gaya platform tujuan.
- Migration baru: salin filenya, cek tabel yang dirujuk ada di platform tujuan. **Jangan jalankan migrate.**
- Kalau platform punya test (`tests/Feature`), port test yang relevan juga.

## 4. Batasan (wajib)

- Jangan jalankan build, migrate, commit, push, pull, checkout branch, atau perintah git yang mengubah riwayat/remote di repo mana pun. Tuliskan perintahnya agar user jalankan sendiri.
- Boleh: membaca, mengedit file, `git status`/`git diff` di tiap repo, `php -l` untuk cek sintaks.

## 5. Laporan akhir

- Per platform: file yang diubah, yang dilewati beserta alasannya, dan hal yang perlu dicek manual.
- Jalankan `php -l` pada file PHP yang diubah, dan laporkan hasilnya.
- Perintah yang perlu user jalankan sendiri (migrate, build, commit) per repo.
- Kalau perubahan menutup poin di "utang sinkron" atau mengubah perbedaan antar platform, perbarui `docs/platform-map.md`.
