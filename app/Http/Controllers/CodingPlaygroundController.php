<?php

namespace App\Http\Controllers;

use App\Models\CodingLesson;
use App\Models\CodingLessonProgress;
use App\Models\CodingTrack;
use App\Services\HtmlContentSanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
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

        ['modules' => $modules, 'lessons' => $lessons] = $this->getOrderedCurriculum($track, includeInstructions: true);

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
            'modules' => $modules,
            'lessons' => $lessons->values(),
            'completedLessonIds' => $completedLessonIds,
        ]);
    }

    public function lesson(
        Request $request,
        CodingTrack $track,
        CodingLesson $lesson,
        HtmlContentSanitizer $sanitizer
    ): Response {
        $lesson->loadMissing('module:id,title,is_active');

        abort_unless(
            $track->is_active && (int) $lesson->coding_track_id === (int) $track->id && $lesson->isPubliclyAccessible(),
            404
        );

        ['modules' => $modules, 'lessons' => $lessons] = $this->getOrderedCurriculum($track, includeInstructions: false);

        $currentIndex = $lessons->search(fn ($item) => (int) $item['id'] === (int) $lesson->id);
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
                'coding_module_id' => $lesson->coding_module_id,
                'module_title' => $lesson->module?->title,
                'title' => $lesson->title,
                'slug' => $lesson->slug,
                'content' => $sanitizer->sanitize($lesson->content),
                'starter_html' => $lesson->starter_html ?? '',
                'starter_css' => $lesson->starter_css ?? '',
                'starter_js' => $lesson->starter_js ?? '',
                'instructions' => $lesson->instructions,
                'sort_order' => $lesson->sort_order,
            ],
            'modules' => $modules,
            'lessons' => $lessons->values(),
            'previousLesson' => $previousLesson ? [
                'id' => $previousLesson['id'],
                'title' => $previousLesson['title'],
                'slug' => $previousLesson['slug'],
            ] : null,
            'nextLesson' => $nextLesson ? [
                'id' => $nextLesson['id'],
                'title' => $nextLesson['title'],
                'slug' => $nextLesson['slug'],
            ] : null,
            'completedLessonIds' => $completedLessonIds,
        ]);
    }

    /**
     * Build chapter-grouped and sequentially flattened active curriculum for a track.
     *
     * @return array{modules: array<int, array<string, mixed>>, lessons: Collection<int, array<string, mixed>>}
     */
    private function getOrderedCurriculum(CodingTrack $track, bool $includeInstructions): array
    {
        $lessonColumns = [
            'id',
            'coding_track_id',
            'coding_module_id',
            'title',
            'slug',
            'sort_order',
        ];
        if ($includeInstructions) {
            $lessonColumns[] = 'instructions';
        }

        $activeModules = $track->activeModules()
            ->with([
                'activeLessons' => fn ($query) => $query->select($lessonColumns),
            ])
            ->get(['id', 'coding_track_id', 'title', 'description', 'sort_order']);

        $ungroupedLessons = CodingLesson::query()
            ->where('coding_track_id', $track->id)
            ->whereNull('coding_module_id')
            ->where('is_active', true)
            ->ordered()
            ->get($lessonColumns);

        $mapLesson = function (CodingLesson $item) use ($includeInstructions): array {
            $mapped = [
                'id' => $item->id,
                'coding_track_id' => $item->coding_track_id,
                'coding_module_id' => $item->coding_module_id,
                'title' => $item->title,
                'slug' => $item->slug,
                'sort_order' => $item->sort_order,
            ];

            if ($includeInstructions) {
                $mapped['instructions'] = $item->instructions;
            }

            return $mapped;
        };

        $modulesPayload = [];
        $flatLessons = collect();

        foreach ($activeModules as $module) {
            $moduleLessons = $module->activeLessons->map($mapLesson)->values();
            $modulesPayload[] = [
                'id' => $module->id,
                'title' => $module->title,
                'description' => $module->description,
                'sort_order' => $module->sort_order,
                'lessons' => $moduleLessons->all(),
            ];
            $flatLessons = $flatLessons->concat($moduleLessons);
        }

        if ($ungroupedLessons->isNotEmpty()) {
            $mappedUngrouped = $ungroupedLessons->map($mapLesson)->values();
            $modulesPayload[] = [
                'id' => null,
                'title' => count($modulesPayload) > 0 ? 'Materi Lainnya' : 'Daftar Materi',
                'description' => null,
                'sort_order' => 999999,
                'lessons' => $mappedUngrouped->all(),
            ];
            $flatLessons = $flatLessons->concat($mappedUngrouped);
        }

        return [
            'modules' => $modulesPayload,
            'lessons' => $flatLessons->values(),
        ];
    }
}
