<?php

namespace App\Http\Controllers\Api\Agent;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\DokuService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /api/v1/agent/payment-reconciliation?date=YYYY-MM-DD
 *
 * Rekonsiliasi harian (Fina, D3): mencocokkan status invoice Aksademy dengan DOKU (Check Status API,
 * GET saja — tidak mengubah data di mana pun). Kunci DOKU tetap di server ini; agent tidak memegangnya.
 *
 * Dicek (nominal > 0, invoice dikirim ke DOKU dengan invoice_code apa adanya):
 *  - lunas di Aksademy pada tanggal itu (paid_at) → DOKU harus SUCCESS. Selain itu = "paid_not_in_doku"
 *    (callback palsu/keliru — perlu dicek manual).
 *  - dibuat pada tanggal itu dan masih pending/gagal di Aksademy → bila DOKU SUCCESS = "doku_paid_not_recorded"
 *    (callback hilang — peserta sudah bayar tapi belum dapat akses).
 * Termin cicilan ke-2 dst. dikirim ke DOKU dengan nomor `<invoice_code>_<waktu>`; sejak 2026-11-16 nomor itu
 * disimpan di `doku_invoice_number` dan dipakai untuk cek. Termin lunas tanpa nomor itu (data lama) dihitung
 * `unverifiable`; termin belum dibayar tanpa nomor = belum pernah dibuka checkout-nya, dilewati.
 * Tanpa data pribadi: hanya kode invoice, nominal, dan status.
 */
class PaymentReconciliationController extends Controller
{
    private const MAX_CHECKS = 200;

    public function __invoke(Request $request, DokuService $doku): JsonResponse
    {
        $validated = $request->validate(['date' => 'nullable|date_format:Y-m-d|before_or_equal:today']);
        $date = isset($validated['date'])
            ? Carbon::createFromFormat('Y-m-d', $validated['date'])->startOfDay()
            : now()->subDay()->startOfDay();
        $day = [$date, $date->copy()->endOfDay()];

        // Induk cicilan tidak dibayar langsung ke DOKU (yang dibayar termin anaknya).
        $base = fn () => Invoice::query()
            ->where('nett_amount', '>', 0)
            ->where(fn ($q) => $q->whereNotNull('parent_invoice_id')->orWhere('is_installment', false));

        $paid = $base()->where('status', 'paid')->whereBetween('paid_at', $day)->get();
        $unpaid = $base()->whereIn('status', ['pending', 'failed'])->whereBetween('created_at', $day)->get();

        // Nomor order di DOKU: termin ke-2 dst. memakai doku_invoice_number; lainnya invoice_code apa adanya.
        $dokuNumber = fn (Invoice $i) => $i->doku_invoice_number
            ?: (($i->parent_invoice_id && (int) $i->installment_number > 1) ? null : $i->invoice_code);

        $summary = [
            'paid_checked' => 0, 'paid_matched' => 0,
            'unpaid_checked' => 0, 'unpaid_matched' => 0,
            'unverifiable' => 0, 'doku_errors' => 0, 'skipped_limit' => 0,
        ];
        $mismatches = [];
        $checks = 0;

        foreach ([['paid', $paid], ['unpaid', $unpaid]] as [$group, $invoices]) {
            foreach ($invoices as $inv) {
                $number = $dokuNumber($inv);
                if ($number === null) {
                    if ($group === 'paid') {
                        $summary['unverifiable']++;
                    }
                    continue;
                }
                if ($checks >= self::MAX_CHECKS) {
                    $summary['skipped_limit']++;
                    continue;
                }
                $checks++;
                $status = $doku->checkStatus($number)['status'];
                if ($status === 'ERROR') {
                    $summary['doku_errors']++;
                    continue;
                }
                $summary["{$group}_checked"]++;

                $ok = $group === 'paid' ? $status === 'SUCCESS' : $status !== 'SUCCESS';
                if ($ok) {
                    $summary["{$group}_matched"]++;
                    continue;
                }
                $mismatches[] = [
                    'type' => $group === 'paid' ? 'paid_not_in_doku' : 'doku_paid_not_recorded',
                    'invoice_code' => $inv->invoice_code,
                    'kind' => $inv->parent_invoice_id ? 'installment' : 'purchase',
                    'amount' => (int) $inv->nett_amount,
                    'aksademy_status' => $inv->status,
                    'doku_status' => $status,
                    'created_at' => $inv->created_at?->toIso8601String(),
                    'paid_at' => $inv->paid_at?->toIso8601String(),
                ];
            }
        }

        return response()->json([
            'generated_at' => now()->toIso8601String(),
            'timezone' => config('app.timezone'),
            'currency' => 'IDR',
            'date' => $date->toDateString(),
            'gateway' => 'doku',
            'paid_amount' => (int) $paid->sum('nett_amount'),
            'summary' => $summary,
            'mismatches' => $mismatches,
        ]);
    }
}
