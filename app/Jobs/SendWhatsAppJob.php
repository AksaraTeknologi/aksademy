<?php
namespace App\Jobs;

use App\Services\WhatsApp\PhoneNumber;
use App\Services\WhatsApp\WhatsApp;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Kirim WhatsApp lewat antrean memakai gateway aktif (DEFAULT_WA_GATEWAY).
 */
class SendWhatsAppJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [30, 60, 120];

    public function __construct(
        public string $phone,
        public string $message,
        public ?string $refId = null,
    ) {
        // ref_id tetap sama di setiap retry job, sehingga Messara tidak mengirim ulang pesan yang sudah terkirim.
        $this->refId ??= (string) Str::uuid();
    }

    public function handle(): void
    {
        Log::info("Memproses SendWhatsAppJob untuk {$this->phone}");

        $result = WhatsApp::sendTextResult([[
            'phone' => PhoneNumber::normalize($this->phone),
            'message' => $this->message,
            'isGroup' => 'false',
            'ref_id' => $this->refId,
        ]]);

        if ($result->isSent()) {
            return;
        }

        $reasons = array_filter(array_merge([$result->reason], array_column($result->items, 'reason')));
        $error = new \Exception("Gagal mengirim WhatsApp via {$result->gateway} ke {$this->phone} (".implode(', ', $reasons ?: [$result->status->value]).')');

        // Kuota harian habis atau kredensial kosong: retry tidak akan membantu.
        if (array_intersect($reasons, ['daily_limit_reached', 'missing_credentials'])) {
            $this->fail($error);

            return;
        }

        throw $error;
    }
}
