#!/usr/bin/env bash
# Bandingkan aksademy dengan platform turunan. Hanya membaca, tidak mengubah apa pun.
#
# Pakai:
#   scripts/platform-diff.sh                 # matriks file inti + controller unik/hilang
#   scripts/platform-diff.sh <path/file.php> # diff logika satu file di semua platform
#
# Angka = jumlah baris logika yang beda (komentar & format diabaikan via `php -w`).
# 0 = identik, "-" = file tidak ada di platform itu.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CORE="aksademy"
PLATFORMS=(sekolah-pajak talenta-edu skill-grow-new smartcounting-new biinspira kompeten levelupcounting)

norm() { php -w "$1" 2>/dev/null | tr ';{}' '\n\n\n' | sed 's/ //g' | grep -v '^$' || true; }

count() { # count <relpath> <platform>
  local a="$ROOT/$CORE/$1" b="$ROOT/$2/$1"
  [[ -f "$b" ]] || { echo "-"; return; }
  diff <(norm "$a") <(norm "$b") | grep -c '^[<>]' || true
}

if [[ $# -eq 1 ]]; then
  for p in "${PLATFORMS[@]}"; do
    echo "=================== $p ($(count "$1" "$p"))"
    [[ -f "$ROOT/$p/$1" ]] && diff <(norm "$ROOT/$CORE/$1") <(norm "$ROOT/$p/$1") || true
  done
  exit 0
fi

FILES=(
  app/Http/Controllers/InvoiceController.php
  app/Http/Controllers/InstallmentController.php
  app/Models/Invoice.php
  app/Models/User.php
  app/Services/ReferralService.php
  app/Services/RewardService.php
  app/Services/PointService.php
  app/Http/Controllers/AffiliateController.php
  app/Http/Controllers/AffiliateEarningController.php
  app/Services/CertificatePdfService.php
  app/Http/Controllers/CertificateController.php
  app/Http/Controllers/CourseController.php
  app/Http/Controllers/WebinarController.php
  app/Http/Controllers/BootcampController.php
  app/Http/Controllers/Auth/RegisteredUserController.php
)

printf "%-44s" "file"; for p in "${PLATFORMS[@]}"; do printf "%7.7s " "$p"; done; echo
for f in "${FILES[@]}"; do
  printf "%-44s" "${f#app/}"
  for p in "${PLATFORMS[@]}"; do printf "%7s " "$(count "$f" "$p")"; done; echo
done

echo; echo "# Controller (relatif ke app/Http/Controllers)"
list() { (cd "$ROOT/$1/app/Http/Controllers" && find . -name '*.php' | sed 's#^\./##' | sort); }
for p in "${PLATFORMS[@]}"; do
  echo "== $p"
  echo "  hanya di $p: $(comm -13 <(list "$CORE") <(list "$p") | tr '\n' ' ')"
  echo "  tidak ada di $p: $(comm -23 <(list "$CORE") <(list "$p") | tr '\n' ' ')"
done
