<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCodingLessonRequest;
use App\Http\Requests\Admin\UpdateCodingLessonRequest;
use App\Models\CodingLesson;
use App\Models\CodingModule;
use App\Models\CodingTrack;
use App\Services\HtmlContentSanitizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CodingLessonController extends Controller
{
    public function index(Request $request): Response
    {
        $query = CodingLesson::query()
            ->with(['track:id,title,slug,is_active', 'module:id,coding_track_id,title,is_active'])
            ->orderBy('coding_track_id')
            ->orderByRaw('CASE WHEN coding_module_id IS NULL THEN 1 ELSE 0 END')
            ->orderBy('coding_module_id')
            ->orderBy('sort_order')
            ->orderBy('id');

        if ($request->filled('track_id')) {
            $query->where('coding_track_id', (int) $request->input('track_id'));
        }

        if ($request->filled('module_id')) {
            if ($request->input('module_id') === 'none') {
                $query->whereNull('coding_module_id');
            } else {
                $query->where('coding_module_id', (int) $request->input('module_id'));
            }
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 15)));
        $lessons = $query->paginate($perPage)->withQueryString();

        $tracks = CodingTrack::query()
            ->ordered()
            ->get(['id', 'title', 'slug', 'is_active']);

        $modules = CodingModule::query()
            ->ordered()
            ->get(['id', 'coding_track_id', 'title', 'is_active']);

        return Inertia::render('admin/coding-playground/lessons/index', [
            'lessons' => $lessons,
            'tracks' => $tracks,
            'modules' => $modules,
            'filters' => [
                'track_id' => $request->input('track_id') ? (string) $request->input('track_id') : '',
                'module_id' => $request->input('module_id') ? (string) $request->input('module_id') : '',
                'search' => $request->input('search'),
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $tracks = CodingTrack::query()
            ->ordered()
            ->get(['id', 'title', 'slug', 'is_active']);

        $modules = CodingModule::query()
            ->ordered()
            ->get(['id', 'coding_track_id', 'title', 'is_active']);

        return Inertia::render('admin/coding-playground/lessons/create', [
            'tracks' => $tracks,
            'modules' => $modules,
            'defaultTrackId' => $request->input('track_id') ? (string) $request->input('track_id') : ($tracks->first()?->id ? (string) $tracks->first()->id : ''),
            'defaultModuleId' => $request->input('module_id') ? (string) $request->input('module_id') : '',
        ]);
    }

    public function store(StoreCodingLessonRequest $request, HtmlContentSanitizer $sanitizer): RedirectResponse
    {
        $validated = $request->validated();

        CodingLesson::create([
            'coding_track_id' => (int) $validated['coding_track_id'],
            'coding_module_id' => ! empty($validated['coding_module_id']) ? (int) $validated['coding_module_id'] : null,
            'title' => $validated['title'],
            'slug' => $validated['slug'],
            'content' => $sanitizer->sanitize($validated['content']),
            'starter_html' => $validated['starter_html'] ?? null,
            'starter_css' => $validated['starter_css'] ?? null,
            'starter_js' => $validated['starter_js'] ?? null,
            'instructions' => $validated['instructions'] ?? null,
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()
            ->route('admin.coding-playground.lessons.index', ['track_id' => $validated['coding_track_id']])
            ->with('success', 'Materi Coding Playground berhasil ditambahkan.');
    }

    public function edit(CodingLesson $lesson): Response
    {
        $tracks = CodingTrack::query()
            ->ordered()
            ->get(['id', 'title', 'slug', 'is_active']);

        $modules = CodingModule::query()
            ->ordered()
            ->get(['id', 'coding_track_id', 'title', 'is_active']);

        return Inertia::render('admin/coding-playground/lessons/edit', [
            'lesson' => $lesson,
            'tracks' => $tracks,
            'modules' => $modules,
        ]);
    }

    public function update(
        UpdateCodingLessonRequest $request,
        CodingLesson $lesson,
        HtmlContentSanitizer $sanitizer
    ): RedirectResponse {
        $validated = $request->validated();

        $lesson->update([
            'coding_track_id' => (int) $validated['coding_track_id'],
            'coding_module_id' => ! empty($validated['coding_module_id']) ? (int) $validated['coding_module_id'] : null,
            'title' => $validated['title'],
            'slug' => $validated['slug'],
            'content' => $sanitizer->sanitize($validated['content']),
            'starter_html' => $validated['starter_html'] ?? null,
            'starter_css' => $validated['starter_css'] ?? null,
            'starter_js' => $validated['starter_js'] ?? null,
            'instructions' => $validated['instructions'] ?? null,
            'is_active' => $request->boolean('is_active', $lesson->is_active),
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()
            ->route('admin.coding-playground.lessons.index', ['track_id' => $validated['coding_track_id']])
            ->with('success', 'Materi Coding Playground berhasil diperbarui.');
    }

    public function destroy(CodingLesson $lesson): RedirectResponse
    {
        $lesson->delete();

        return back()->with('success', 'Materi Coding Playground berhasil dihapus.');
    }

    public function duplicate(CodingLesson $lesson): RedirectResponse
    {
        $baseSlug = Str::slug($lesson->slug . '-copy');
        $slug = $baseSlug;
        $counter = 2;

        while (
            CodingLesson::where('coding_track_id', $lesson->coding_track_id)
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = $baseSlug . '-' . $counter++;
        }

        $maxOrder = (int) CodingLesson::where('coding_track_id', $lesson->coding_track_id)->max('sort_order');

        CodingLesson::create([
            'coding_track_id' => $lesson->coding_track_id,
            'coding_module_id' => $lesson->coding_module_id,
            'title' => $lesson->title . ' (Salinan)',
            'slug' => $slug,
            'content' => $lesson->content,
            'starter_html' => $lesson->starter_html,
            'starter_css' => $lesson->starter_css,
            'starter_js' => $lesson->starter_js,
            'instructions' => $lesson->instructions,
            'is_active' => false,
            'sort_order' => $maxOrder + 1,
        ]);

        return back()->with('success', 'Materi berhasil diduplikasi sebagai draft.');
    }

    public function toggleStatus(CodingLesson $lesson): RedirectResponse
    {
        $lesson->update([
            'is_active' => ! $lesson->is_active,
        ]);

        return back()->with('success', 'Status publikasi materi berhasil diperbarui.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', 'exists:coding_lessons,id'],
            'items.*.sort_order' => ['required', 'integer', 'min:0', 'max:100000'],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['items'] as $item) {
                CodingLesson::where('id', $item['id'])->update([
                    'sort_order' => $item['sort_order'],
                ]);
            }
        });

        return back()->with('success', 'Urutan materi berhasil diperbarui.');
    }
}
