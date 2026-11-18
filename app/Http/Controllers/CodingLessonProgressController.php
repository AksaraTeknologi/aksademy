<?php

namespace App\Http\Controllers;

use App\Models\CodingLesson;
use App\Models\CodingLessonProgress;
use App\Models\CodingTrack;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CodingLessonProgressController extends Controller
{
    public function store(Request $request, CodingTrack $track, CodingLesson $lesson): JsonResponse|RedirectResponse
    {
        abort_unless(
            $track->is_active && $lesson->is_active && (int) $lesson->coding_track_id === (int) $track->id,
            404
        );

        $user = $request->user();

        $progress = CodingLessonProgress::updateOrCreate(
            [
                'user_id' => $user->id,
                'coding_lesson_id' => $lesson->id,
            ],
            [
                'completed_at' => now(),
            ]
        );

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'completed' => true,
                'coding_lesson_id' => $lesson->id,
                'completed_at' => $progress->completed_at,
            ]);
        }

        return back()->with('success', 'Materi berhasil ditandai selesai.');
    }

    public function destroy(Request $request, CodingTrack $track, CodingLesson $lesson): JsonResponse|RedirectResponse
    {
        abort_unless(
            $track->is_active && $lesson->is_active && (int) $lesson->coding_track_id === (int) $track->id,
            404
        );

        $user = $request->user();

        CodingLessonProgress::query()
            ->where('user_id', $user->id)
            ->where('coding_lesson_id', $lesson->id)
            ->delete();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'completed' => false,
                'coding_lesson_id' => $lesson->id,
            ]);
        }

        return back()->with('success', 'Status selesai materi dibatalkan.');
    }
}
