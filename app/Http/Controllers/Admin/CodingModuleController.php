<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCodingModuleRequest;
use App\Http\Requests\Admin\UpdateCodingModuleRequest;
use App\Models\CodingModule;
use App\Models\CodingTrack;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CodingModuleController extends Controller
{
    public function index(Request $request): Response
    {
        $query = CodingModule::query()
            ->with(['track:id,title,slug,is_active'])
            ->withCount([
                'lessons',
                'activeLessons as active_lessons_count',
            ])
            ->orderBy('coding_track_id')
            ->orderBy('sort_order')
            ->orderBy('id');

        if ($request->filled('track_id')) {
            $query->where('coding_track_id', (int) $request->input('track_id'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 15)));
        $modules = $query->paginate($perPage)->withQueryString();

        $tracks = CodingTrack::query()
            ->ordered()
            ->get(['id', 'title', 'slug', 'is_active']);

        return Inertia::render('admin/coding-playground/modules/index', [
            'modules' => $modules,
            'tracks' => $tracks,
            'filters' => [
                'track_id' => $request->input('track_id') ? (string) $request->input('track_id') : '',
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

        return Inertia::render('admin/coding-playground/modules/create', [
            'tracks' => $tracks,
            'defaultTrackId' => $request->input('track_id') ? (string) $request->input('track_id') : ($tracks->first()?->id ? (string) $tracks->first()->id : ''),
        ]);
    }

    public function store(StoreCodingModuleRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        CodingModule::create([
            'coding_track_id' => (int) $validated['coding_track_id'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()
            ->route('admin.coding-playground.modules.index', ['track_id' => $validated['coding_track_id']])
            ->with('success', 'Bab Coding Playground berhasil ditambahkan.');
    }

    public function edit(CodingModule $module): Response
    {
        $tracks = CodingTrack::query()
            ->ordered()
            ->get(['id', 'title', 'slug', 'is_active']);

        return Inertia::render('admin/coding-playground/modules/edit', [
            'module' => $module,
            'tracks' => $tracks,
        ]);
    }

    public function update(UpdateCodingModuleRequest $request, CodingModule $module): RedirectResponse
    {
        $validated = $request->validated();
        $newTrackId = (int) $validated['coding_track_id'];

        DB::transaction(function () use ($module, $validated, $request, $newTrackId) {
            $oldTrackId = (int) $module->coding_track_id;

            $module->update([
                'coding_track_id' => $newTrackId,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'is_active' => $request->boolean('is_active', $module->is_active),
                'sort_order' => $validated['sort_order'] ?? 0,
            ]);

            if ($oldTrackId !== $newTrackId) {
                $module->lessons()->update(['coding_module_id' => null]);
            }
        });

        return redirect()
            ->route('admin.coding-playground.modules.index', ['track_id' => $newTrackId])
            ->with('success', 'Bab Coding Playground berhasil diperbarui.');
    }

    public function destroy(CodingModule $module): RedirectResponse
    {
        $module->delete();

        return back()->with('success', 'Bab Coding Playground berhasil dihapus.');
    }

    public function toggleStatus(CodingModule $module): RedirectResponse
    {
        $module->update([
            'is_active' => ! $module->is_active,
        ]);

        return back()->with('success', 'Status publikasi bab berhasil diperbarui.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', 'exists:coding_modules,id'],
            'items.*.sort_order' => ['required', 'integer', 'min:0', 'max:100000'],
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['items'] as $item) {
                CodingModule::where('id', $item['id'])->update([
                    'sort_order' => $item['sort_order'],
                ]);
            }
        });

        return back()->with('success', 'Urutan bab berhasil diperbarui.');
    }
}
