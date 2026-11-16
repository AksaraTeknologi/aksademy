<?php

namespace App\Http\Controllers\Api\Agent;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /api/v1/agent/pending-invoices?due_days=3
 *
 * Tagihan yang belum dibayar untuk pengingat WhatsApp (Fina, D5). BERISI DATA PRIBADI
 * (nama & no. WA) → ability terpisah `agent:read-pii`; token biasa `agent:read` ditolak.
 *
 * - purchases: invoice pembelian `pending` yang belum kedaluwarsa (berlaku 24 jam), nominal > 0.
 *   Dilewati bila pembeli sudah punya invoice lunas/cicilan aktif yang dibuat setelahnya (checkout ulang).
 * - installments: termin cicilan `pending` yang jatuh tempo dalam `due_days` hari ke depan atau sudah
 *   lewat (maks. 30 hari).
 *
 * Link: `invoice_url` (halaman bayar DOKU) bila ada, selain itu halaman invoice Aksademy (perlu login,
 * untuk termin diarahkan ke halaman pembayaran termin). Akun agent tidak ikut.
 */
class PendingInvoicesController extends Controller
{
    private const RELATIONS = [
        'user:id,name,phone_number,email',
        'courseItems.course:id,title',
        'bootcampItems.bootcamp:id,title',
        'webinarItems.webinar:id,title',
        'privateItems.privateClass:id,title',
        'certificationProgramItems.certificationProgram:id,title',
        'bundleEnrollments.bundle:id,title',
    ];

    private const LIMIT = 100;

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate(['due_days' => 'nullable|integer|min:0|max:14']);
        $dueDays = (int) ($validated['due_days'] ?? 3);
        $now = now();

        $purchases = Invoice::query()
            ->with(self::RELATIONS)
            ->where('status', 'pending')
            ->whereNull('parent_invoice_id')
            ->where('is_installment', false)
            ->where('nett_amount', '>', 0)
            ->where('expires_at', '>', $now)
            ->whereHas('user', fn (Builder $q) => $q->where('email', 'not like', '%@agents.aksademy.local'))
            ->whereNotExists(function ($q) {
                $q->selectRaw('1')->from('invoices as later')
                    ->whereColumn('later.user_id', 'invoices.user_id')
                    ->whereNull('later.parent_invoice_id')
                    ->whereColumn('later.created_at', '>=', 'invoices.created_at')
                    ->whereIn('later.status', ['paid', 'completed', 'installment_pending']);
            })
            ->orderBy('expires_at')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Invoice $inv) => $this->row($inv, $inv, 'purchase', $inv->expires_at));

        $terms = Invoice::query()
            ->with(['user:id,name,phone_number,email', 'parentInvoice' => fn ($q) => $q->with(array_slice(self::RELATIONS, 1))])
            ->where('status', 'pending')
            ->whereNotNull('parent_invoice_id')
            ->where('nett_amount', '>', 0)
            ->whereNotNull('installment_due_date')
            ->whereBetween('installment_due_date', [$now->copy()->subDays(30), $now->copy()->addDays($dueDays)->endOfDay()])
            ->whereHas('parentInvoice', fn (Builder $q) => $q->where('status', 'installment_pending'))
            ->whereHas('user', fn (Builder $q) => $q->where('email', 'not like', '%@agents.aksademy.local'))
            ->orderBy('installment_due_date')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Invoice $inv) => $this->row($inv, $inv->parentInvoice ?? $inv, 'installment', $inv->installment_due_date));

        return response()->json([
            'generated_at' => $now->toIso8601String(),
            'timezone' => config('app.timezone'),
            'currency' => 'IDR',
            'due_days' => $dueDays,
            'contains_personal_data' => true,
            'purchases' => $purchases->values(),
            'installments' => $terms->values(),
        ]);
    }

    private function row(Invoice $inv, Invoice $productSource, string $kind, ?Carbon $deadline): array
    {
        $products = collect()
            ->merge($productSource->bundleEnrollments->pluck('bundle.title'))
            ->merge($productSource->courseItems->pluck('course.title'))
            ->merge($productSource->bootcampItems->pluck('bootcamp.title'))
            ->merge($productSource->webinarItems->pluck('webinar.title'))
            ->merge($productSource->privateItems->pluck('privateClass.title'))
            ->merge($productSource->certificationProgramItems->pluck('certificationProgram.title'))
            ->filter()->unique()->values();

        return array_filter([
            'id' => $inv->id,
            'invoice_code' => $inv->invoice_code,
            'kind' => $kind,
            'installment_number' => $kind === 'installment' ? $inv->installment_number : null,
            'name' => $inv->user?->name,
            'whatsapp' => self::whatsapp($inv->user?->phone_number),
            'products' => $products->all(),
            'amount' => (int) $inv->nett_amount,
            'created_at' => $inv->created_at?->toIso8601String(),
            'deadline' => $deadline?->toIso8601String(),
            'overdue' => $deadline ? $deadline->isPast() : false,
            'pay_url' => $inv->invoice_url ?: route('invoice.show', $inv->id),
        ], fn ($v) => $v !== null);
    }

    /** Nomor WA format internasional tanpa '+' (628…), atau null bila tidak masuk akal. */
    public static function whatsapp(?string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone);
        if (str_starts_with($digits, '0')) {
            $digits = '62'.substr($digits, 1);
        } elseif (str_starts_with($digits, '8')) {
            $digits = '62'.$digits;
        }

        return preg_match('/^62\d{8,13}$/', $digits) ? $digits : null;
    }
}
