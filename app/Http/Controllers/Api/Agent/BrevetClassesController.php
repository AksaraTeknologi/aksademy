<?php

namespace App\Http\Controllers\Api\Agent;

use App\Http\Controllers\Controller;
use App\Models\CertificationProgram;
use App\Services\Brevetlearning\ProgramParticipants;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/v1/agent/brevet-classes
 *
 * Batch sertifikasi yang terhubung ke kelas brevetlearning.id (kode kelas diisi di tab Pendaftar)
 * beserta peserta Aksademy-nya (lunas / cicilan ≥1 termin). Untuk Cava: hanya peserta Aksademy
 * yang dipantau, bukan peserta platform lain di kelas yang sama. BERISI DATA PRIBADI (nama, email,
 * no. HP) → ability `agent:read-pii` (agent:token certification --pii).
 */
class BrevetClassesController extends Controller
{
    public function __invoke(ProgramParticipants $participants): JsonResponse
    {
        $programs = CertificationProgram::whereNotNull('brevetlearning_course_code')
            ->where('brevetlearning_course_code', '!=', '')
            ->orderByDesc('created_at')
            ->get(['id', 'title', 'batch', 'brevetlearning_course_code', 'brevetlearning_platform']);

        return response()->json([
            'data' => $programs->map(fn (CertificationProgram $program) => [
                'program_id' => $program->id,
                'title' => $program->title,
                'batch' => $program->batch,
                'course_code' => $program->brevetlearning_course_code,
                'participants' => $participants->eligible($program)->map(fn ($p) => [
                    'name' => $p['name'],
                    'email' => $p['email'],
                    'phone_number' => $p['phone_number'],
                    'payment' => $p['payment'],
                ])->values(),
            ])->values(),
        ]);
    }
}
