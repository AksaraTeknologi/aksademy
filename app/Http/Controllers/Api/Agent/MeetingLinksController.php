<?php

namespace App\Http\Controllers\Api\Agent;

use App\Http\Controllers\Controller;
use App\Services\Agent\ScheduleItems;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

/**
 * GET /api/v1/agent/meeting-links?date=YYYY-MM-DD&days=1
 *
 * URL Zoom (`meeting_url`) sesi webinar, bootcamp, dan program sertifikasi mulai
 * `date` (default hari ini) selama `days` hari (1–7). Hanya untuk token academic
 * (ability `agent:write-meeting`): Aska mengirim link ke topic Akademik saat diminta tim.
 * Sesi tanpa link tetap dicantumkan dengan `meeting_url` = null agar agent tidak menebak.
 */
class MeetingLinksController extends Controller
{
    public function __invoke(Request $request, ScheduleItems $schedules): JsonResponse
    {
        $validated = $request->validate([
            'date' => 'nullable|date_format:Y-m-d',
            'days' => 'nullable|integer|min:1|max:7',
        ]);

        $from = isset($validated['date'])
            ? Carbon::createFromFormat('Y-m-d', $validated['date'])->startOfDay()
            : now()->startOfDay();
        $to = $from->copy()->addDays((int) ($validated['days'] ?? 1) - 1);

        $items = $schedules->between($from, $to)
            ->map(fn (array $i) => Arr::only($i, [
                'type', 'id', 'title', 'session_title', 'batch', 'session_number', 'sessions_total', 'start', 'end', 'meeting_url',
            ]))
            ->values();

        return response()->json([
            'generated_at' => now()->toIso8601String(),
            'timezone' => config('app.timezone'),
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'items' => $items,
        ]);
    }
}
