<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCodingTrackRequest;
use App\Http\Requests\Admin\UpdateCodingTrackRequest;
use App\Models\CodingTrack;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CodingTrackController extends Controller
{
    public function index(Request $request): Response
    {
        $query = CodingTrack::query()
            ->withCount([
                'lessons',
                'activeLessons as active_lessons_count',
            ])
            ->ordered();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 15)));
        $tracks = $query->paginate($perPage)->withQueryString();

        return Inertia::render('admin/coding-playground/tracks/index', [
            'tracks' => $tracks,
            'filters' => [
                'search' => $request->input('search'),
                'per_page' => $perPage,
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/coding-playground/tracks/create');
    }

    public function store(StoreCodingTrackRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $thumbnailPath = null;
        if ($request->hasFile('thumbnail')) {
            $thumbnailPath = $request->file('thumbnail')->store('coding_tracks', 'public');
        }

        CodingTrack::create([
            'title' => $validated['title'],
            'slug' => $validated['slug'],
            'description' => $validated['description'] ?? null,
            'thumbnail' => $thumbnailPath,
            'level' => $validated['level'],
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()
            ->route('admin.coding-playground.tracks.index')
            ->with('success', 'Program Coding Playground berhasil ditambahkan.');
    }

    public function edit(CodingTrack $track): Response
    {
        return Inertia::render('admin/coding-playground/tracks/edit', [
            'track' => $track,
        ]);
    }

    public function update(UpdateCodingTrackRequest $request, CodingTrack $track): RedirectResponse
    {
        $validated = $request->validated();

        $thumbnailPath = $track->thumbnail;

        if ($request->boolean('remove_thumbnail') && $thumbnailPath) {
            Storage::disk('public')->delete($thumbnailPath);
            $thumbnailPath = null;
        }

        if ($request->hasFile('thumbnail')) {
            if ($thumbnailPath) {
                Storage::disk('public')->delete($thumbnailPath);
            }
            $thumbnailPath = $request->file('thumbnail')->store('coding_tracks', 'public');
        }

        $track->update([
            'title' => $validated['title'],
            'slug' => $validated['slug'],
            'description' => $validated['description'] ?? null,
            'thumbnail' => $thumbnailPath,
            'level' => $validated['level'],
            'is_active' => $request->boolean('is_active', $track->is_active),
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()
            ->route('admin.coding-playground.tracks.index')
            ->with('success', 'Program Coding Playground berhasil diperbarui.');
    }

    public function destroy(CodingTrack $track): RedirectResponse
    {
        if ($track->thumbnail) {
            Storage::disk('public')->delete($track->thumbnail);
        }

        $track->delete();

        return redirect()
            ->route('admin.coding-playground.tracks.index')
            ->with('success', 'Program Coding Playground berhasil dihapus.');
    }

    public function toggleStatus(CodingTrack $track): RedirectResponse
    {
        $track->update([
            'is_active' => ! $track->is_active,
        ]);

        return back()->with('success', 'Status program berhasil diperbarui.');
    }
}
