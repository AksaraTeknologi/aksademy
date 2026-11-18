<?php

namespace App\Http\Controllers;

use App\Models\CodingLesson;
use App\Models\CodingLessonProgress;
use App\Models\CodingTrack;
use App\Services\HtmlContentSanitizer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CodingPlaygroundController extends Controller
{
    public function index(): Response
    {
        $tracks = CodingTrack::query()
            ->active()
            ->ordered()
            ->withCount(['activeLessons as active_lessons_count'])
            ->get([
                'id',
                'title',
                'slug',
                'description',
                'thumbnail',
                'level',
                'sort_order',
            ]);

        return Inertia::render('user/coding-playground/index', [
            'tracks' => $tracks,
        ]);
    }

    public function track(Request $request, CodingTrack $track): Response
    {
        abort_unless($track->is_active, 404);

        $lessons = $track->activeLessons()
            ->get([
                'id',
                'coding_track_id',
                'title',
                'slug',
                'instructions',
                'sort_order',
            ]);

        $completedLessonIds = [];
        if ($request->user()) {
            $lessonIds = $lessons->pluck('id');
            $completedLessonIds = CodingLessonProgress::query()
                ->where('user_id', $request->user()->id)
                ->whereIn('coding_lesson_id', $lessonIds)
                ->pluck('coding_lesson_id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        return Inertia::render('user/coding-playground/track', [
            'track' => [
                'id' => $track->id,
                'title' => $track->title,
                'slug' => $track->slug,
                'description' => $track->description,
                'thumbnail' => $track->thumbnail,
                'level' => $track->level,
            ],
            'lessons' => $lessons,
            'completedLessonIds' => $completedLessonIds,
        ]);
    }

    public function lesson(
        Request $request,
        CodingTrack $track,
        CodingLesson $lesson,
        HtmlContentSanitizer $sanitizer
    ): Response {
        abort_unless(
            $track->is_active && $lesson->is_active && (int) $lesson->coding_track_id === (int) $track->id,
            404
        );

        $lessons = $track->activeLessons()
            ->get([
                'id',
                'coding_track_id',
                'title',
                'slug',
                'sort_order',
            ]);

        $currentIndex = $lessons->search(fn ($item) => (int) $item->id === (int) $lesson->id);
        $previousLesson = $currentIndex !== false && $currentIndex > 0 ? $lessons[$currentIndex - 1] : null;
        $nextLesson = $currentIndex !== false && $currentIndex < $lessons->count() - 1 ? $lessons[$currentIndex + 1] : null;

        $completedLessonIds = [];
        if ($request->user()) {
            $completedLessonIds = CodingLessonProgress::query()
                ->where('user_id', $request->user()->id)
                ->whereIn('coding_lesson_id', $lessons->pluck('id'))
                ->pluck('coding_lesson_id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        return Inertia::render('user/coding-playground/lesson', [
            'track' => [
                'id' => $track->id,
                'title' => $track->title,
                'slug' => $track->slug,
                'level' => $track->level,
            ],
            'lesson' => [
                'id' => $lesson->id,
                'coding_track_id' => $lesson->coding_track_id,
                'title' => $lesson->title,
                'slug' => $lesson->slug,
                'content' => $sanitizer->sanitize($lesson->content),
                'starter_html' => $lesson->starter_html ?? '',
                'starter_css' => $lesson->starter_css ?? '',
                'starter_js' => $lesson->starter_js ?? '',
                'instructions' => $lesson->instructions,
                'sort_order' => $lesson->sort_order,
            ],
            'lessons' => $lessons,
            'previousLesson' => $previousLesson ? [
                'id' => $previousLesson->id,
                'title' => $previousLesson->title,
                'slug' => $previousLesson->slug,
            ] : null,
            'nextLesson' => $nextLesson ? [
                'id' => $nextLesson->id,
                'title' => $nextLesson->title,
                'slug' => $nextLesson->slug,
            ] : null,
            'completedLessonIds' => $completedLessonIds,
        ]);
    }
}
