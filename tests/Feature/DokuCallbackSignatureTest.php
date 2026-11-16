<?php

use App\Models\Invoice;
use App\Models\User;
use App\Services\DokuService;
use Illuminate\Http\Request;

beforeEach(function () {
    config(['services.doku.client_id' => 'BRN-TEST', 'services.doku.secret_key' => 'SK-RAHASIA', 'services.doku.sandbox' => true]);
});

function dokuNotification(array $body, ?string $secret = 'SK-RAHASIA', string $path = '/api/doku/callback'): Request
{
    $raw = json_encode($body);
    $headers = ['Client-Id' => 'BRN-TEST', 'Request-Id' => 'abc-123', 'Request-Timestamp' => '2026-11-16T07:00:00Z'];
    $digest = base64_encode(hash('sha256', $raw, true));
    $component = "Client-Id:BRN-TEST\nRequest-Id:abc-123\nRequest-Timestamp:2026-11-16T07:00:00Z\nRequest-Target:{$path}\nDigest:{$digest}";
    if ($secret !== null) {
        $headers['Signature'] = 'HMACSHA256='.base64_encode(hash_hmac('sha256', $component, $secret, true));
    }

    $server = ['CONTENT_TYPE' => 'application/json'];
    foreach ($headers as $k => $v) {
        $server['HTTP_'.strtoupper(str_replace('-', '_', $k))] = $v;
    }

    return Request::create('/api/doku/callback', 'POST', [], [], [], $server, $raw);
}

$body = ['order' => ['invoice_number' => 'INV-001', 'amount' => 850000], 'transaction' => ['status' => 'SUCCESS']];

it('menerima signature DOKU yang sah', function () use ($body) {
    expect((new DokuService())->signatureValid(dokuNotification($body)))->toBeTrue();
});

it('menolak signature dengan secret salah, tanpa signature, body diubah, atau client lain', function () use ($body) {
    $svc = new DokuService();
    expect($svc->signatureValid(dokuNotification($body, 'SALAH')))->toBeFalse()
        ->and($svc->signatureValid(dokuNotification($body, null)))->toBeFalse();

    $tampered = dokuNotification($body);
    $tampered = Request::create('/api/doku/callback', 'POST', [], [], [], $tampered->server->all(),
        json_encode(['order' => ['invoice_number' => 'INV-001'], 'transaction' => ['status' => 'SUCCESS'], 'x' => 1]));
    expect($svc->signatureValid($tampered))->toBeFalse();

    config(['services.doku.client_id' => 'BRN-LAIN']);
    expect((new DokuService())->signatureValid(dokuNotification($body)))->toBeFalse();
});

it('mode log tetap menerima callback tidak sah (hanya dicatat), mode enforce menolak', function () use ($body) {
    config(['services.doku.verify_callback' => 'log']);
    expect((new DokuService())->verifyCallback(dokuNotification($body, 'SALAH')))->toBeTrue();

    config(['services.doku.verify_callback' => 'enforce']);
    expect((new DokuService())->verifyCallback(dokuNotification($body, 'SALAH')))->toBeFalse()
        ->and((new DokuService())->verifyCallback(dokuNotification($body)))->toBeTrue();
});

it('mode enforce: callback palsu ke /api/doku/callback ditolak dan invoice tetap pending', function () {
    config(['services.doku.verify_callback' => 'enforce']);
    $invoice = Invoice::create([
        'user_id' => User::factory()->create()->id, 'amount' => 850000, 'nett_amount' => 850000,
        'status' => 'pending', 'invoice_code' => 'INV-PALSU',
    ]);

    $this->postJson('/api/doku/callback', [
        'order' => ['invoice_number' => 'INV-PALSU'], 'transaction' => ['status' => 'SUCCESS'],
    ], ['Client-Id' => 'BRN-TEST', 'Request-Id' => 'x', 'Request-Timestamp' => '2026-11-16T07:00:00Z', 'Signature' => 'HMACSHA256=palsu'])
        ->assertStatus(401);

    expect($invoice->fresh()->status)->toBe('pending');
});
