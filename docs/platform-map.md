# Peta Platform: aksademy dan turunannya

Acuan saat memindahkan perubahan dari **aksademy** (sumber) ke 7 platform turunan.
Semua repo ada di `~/Development/Project/<nama>` dan masing-masing punya repo git sendiri.

Data di bawah adalah snapshot **13 Nov 2026**. Untuk angka terbaru, jalankan:

```bash
scripts/platform-diff.sh                      # matriks semua file inti
scripts/platform-diff.sh app/Models/Invoice.php   # detail satu file di semua platform
```

Angka di matriks = jumlah baris **logika** yang berbeda (komentar dan format diabaikan).

---

## 1. Peta modul aksademy

| Domain | Backend utama | Frontend |
|---|---|---|
| Produk: kursus, webinar, bootcamp, bundle, private, program sertifikasi | `CourseController`, `WebinarController`, `BootcampController`, `BundleController`, `PrivateClassController`, `CertificationProgramController` | `pages/admin/*`, `pages/user/{course,webinar,bootcamp,bundling,private,certification-program}` |
| Belajar: modul, lesson, quiz, tugas, progress | `ModuleController`, `LessonController`, `QuizController`, `LessonAssignmentController`, `EnrollmentProgressController`, `QuizSequenceService` | `pages/user/course-detail`, `pages/user/quiz` |
| Checkout & invoice | `InvoiceController` (checkout, callback, free enrollment), `Models/Invoice` (scope `paidPayments`, `purchasedByUser`, `accessibleForUser`) | `pages/user/checkout` |
| Cicilan | `InstallmentController`, `Admin/InstallmentTermController`, command `CheckInstallmentOverdue` | `components/admin/Installment*` |
| Payment gateway | `DokuService`, Xendit SDK di `InvoiceController` | — |
| WA gateway | `MessaraTrait`, `WablasTrait`, `MessaraService`, env `DEFAULT_WA_GATEWAY` | — |
| Afiliasi | `AffiliateController`, `AffiliateEarningController`, pencatatan komisi di `InvoiceController::recordAffiliateCommissionHelper` | `pages/admin/{affiliates,earnings}` |
| Referral & poin | `ReferralService`, `RewardService`, `PointService`, `ReferralController` | `pages/user/profile` |
| Sertifikat | `CertificateController`, `CertificatePdfService`, `CertificateDesign/Sign/Participant` | `pages/user/check-certificate.tsx` |
| Diskon & promo | `DiscountCodeController`, `PromotionController` | — |
| Agent API (khusus aksademy) | `Api/Agent/*`, `Services/Agent/*`, `routes/api.php` | — |
| Event setelah lunas | `Events/TransactionPaid` (identik di semua platform) | — |

---

## 2. Identitas tiap platform

| Platform | Prefix invoice | Warna `--primary` | Payment gateway | WA gateway | Kode afiliasi default |
|---|---|---|---|---|---|
| **aksademy** | `AKS-` | `#003285` | Doku + Xendit | Messara (+ Wablas) | `ATM2025` |
| sekolah-pajak | `SPK-` | `#1B805B` | Midtrans + Tripay + Xendit | Wablas | `SPJ2025` |
| talenta-edu | `TLT-` | `#1976D3` | Midtrans + Tripay + Xendit | Wablas | `TAL2025` |
| skill-grow-new | `SKG-` | `#fccd22` | Doku + Xendit | Wablas | `SGW2025` |
| smartcounting-new | `SCA-` | `#5ce2e5` | Doku + Tripay + Xendit | Wablas | `SAC2026` |
| biinspira | `BRA-` | `#2152A7` | Doku + Tripay + Xendit | Wablas | `BIN2026` |
| kompeten | `KMT-` | `#fca311` | Doku + Tripay + Xendit | Wablas | `KMP2025`, `AKS2025` |
| levelupcounting | `LUC-` | `#0360ED` | Midtrans + Tripay + Manjo (QRIS/VA) + Xendit | Wablas | `LUC2025` |

Prefix invoice dan kode afiliasi default ditulis langsung di kode (`'prefix' => 'AKS-'` 4 tempat; `affiliate_code` di `InvoiceController`). Saat menyalin kode, **ganti keduanya sesuai platform**.

### Fitur yang hanya ada di platform tertentu

| Platform | Fitur tambahan | Tidak punya (dibanding aksademy) |
|---|---|---|
| sekolah-pajak | CRM WhatsApp (`CRM/*`, inbox, auto-reply, AI setting, `ChatbotService`) | Agent API, private class, lesson assignment, meeting link |
| talenta-edu | Alumni, galeri, review (`User/AlumniController`, dst.) | Agent API, private class, lesson assignment, meeting link, carousel admin |
| skill-grow-new | — | Agent API, private class, lesson assignment, meeting link, carousel admin |
| smartcounting-new | Integrasi Brevetlearning/Taxlearning/Taxmateschool, alumni, galeri, WhatsApp lead, sinkron nilai sertifikat | Agent API, lesson assignment, meeting link, carousel admin |
| biinspira | Sama dengan smartcounting-new (kode hampir kembar) | Sama dengan smartcounting-new + `StorageFallbackController` |
| kompeten | — | Agent API, private class, lesson assignment, meeting link, carousel admin |
| levelupcounting | Manjo QRIS/VA, `PaymentSettlementService` | Agent API, private class, lesson assignment, meeting link, carousel admin |

Akibat untuk porting: fitur yang menyentuh private class (mis. `'private' => 'private'` di `ReferralService`) **dilewati** di platform yang tidak punya private class.

---

## 3. Alur afiliasi

Sama di semua platform:
- Rumus komisi afiliasi `nett_amount * commission / 100`, komisi mentor `price * commission / 100`.
- Pembeli tanpa kode afiliasi jatuh ke **afiliasi default** (kode di bagian 2).
- Guard komisi: `affiliate_status === 'Active' && commission > 0 && nett_amount > 0`.

Yang berbeda adalah **kapan afiliasi default dipasang** dan **apakah pembeli diikat**:

| Variasi | Platform | Afiliasi default dipasang di | Fallback `User::role('affiliate')->first()` | Ikat pembeli (`users.referred_by_user_id`) |
|---|---|---|---|---|
| A. Saat lunas | aksademy | `recordAffiliateCommissionHelper` saja | Ya | Ya, saat jatuh ke default, tanpa cek isi lama (`$invoice->user?->update`) |
| B. Saat checkout | sekolah-pajak, talenta-edu, levelupcounting | `store`, `storeBundle`, `enrollFree` + `recordAffiliateCommission(Helper)` | Hanya di helper | Tidak |
| B'. Saat checkout + fallback | smartcounting-new, biinspira, kompeten | Sama dengan B | Ya, di semua titik | Tidak |
| C. Saat lunas + melekat | skill-grow-new | `recordAffiliateCommission(Helper)` | Ya | Ya, hanya kalau masih kosong (`empty($buyer->referred_by_user_id)`) |

Akibat untuk porting: perubahan di alur komisi aksademy (variasi A) **tidak bisa disalin** ke variasi B/B', karena di sana `referred_by_user_id` invoice sudah terisi sejak checkout. Terapkan maksud perubahannya di titik yang sesuai.

`ReferralService`, `ReferralController`, dan `AffiliateController` identik (selisih 0–2 baris, hanya jenis produk `private`).

---

## 4. Zona file: seberapa aman disalin langsung

Dari matriks `scripts/platform-diff.sh` (snapshot 13 Nov 2026):

| Zona | File | Cara porting |
|---|---|---|
| Hijau: salin langsung | `ReferralService`, `ReferralController`, `AffiliateController`, `AffiliateEarningController`, `Events/TransactionPaid`, `CertificateController` (kecuali smartcounting/biinspira) | Salin file atau patch apa adanya. Cek hanya `'private'`. |
| Kuning: patch per bagian | `Models/Invoice`, `Models/User`, `RewardService`, `PointService`, `CertificatePdfService`, `CourseController`, `WebinarController`, `BootcampController`, `RegisteredUserController` | Terapkan hunk demi hunk. Bedanya kecil (< 60 baris) tapi nyata. |
| Merah: porting manual | `InvoiceController` (690–1186 baris beda), `InstallmentController` (90–190) | Jangan disalin. Pahami maksud perubahannya, lalu tulis ulang di bagian yang sesuai, karena alur gateway dan afiliasi berbeda. |
| Merah: frontend | `resources/js/pages/user/*` (100+ file beda per platform) | Tampilan user dikustom per brand. Port logikanya saja, ikuti markup dan warna platform tujuan. |
| Kuning: frontend admin | `resources/js/pages/admin/*` (68–144 file beda) | Admin mirip, tapi cek dulu dengan diff sebelum menyalin. |

### Perbaikan aksademy yang belum ada di platform lain (utang sinkron)

- `RewardService`: aksademy punya guard "reward referral sudah diterima untuk invoice ini" (cek `PointTransaction` dengan `source = 'referral'`). Ketujuh platform belum punya guard ini, sehingga **berisiko reward ganda**.
- `PointService`: versi aksademy berbeda 18–20 baris logika dengan sekolah-pajak, talenta-edu, levelupcounting (bagian `refundPoints`). Cek dengan `scripts/platform-diff.sh app/Services/PointService.php` sebelum port.

Hapus poin dari daftar ini setelah di-port.

---

## 5. Aturan porting

1. Perubahan dibuat dan dites dulu di aksademy.
2. Cek zona file yang tersentuh (bagian 4) dan fitur platform tujuan (bagian 2).
3. Ganti identitas: prefix invoice, nama brand, warna, teks.
4. Jangan menyentuh kode gateway platform tujuan kecuali perubahannya memang tentang gateway.
5. Migration baru: salin file migration-nya, lalu cek apakah tabel yang dirujuk ada di platform tujuan. Jalankan migrate secara manual oleh developer.
6. Tiap platform di-commit di repo-nya sendiri, satu commit per fitur, dengan pesan yang sama dengan commit aksademy supaya mudah dilacak.
