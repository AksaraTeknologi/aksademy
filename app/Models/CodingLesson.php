<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CodingLesson extends Model
{
    use HasFactory;

    protected $fillable = [
        'coding_track_id',
        'title',
        'slug',
        'content',
        'starter_html',
        'starter_css',
        'starter_js',
        'instructions',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'coding_track_id' => 'integer',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function track(): BelongsTo
    {
        return $this->belongsTo(CodingTrack::class, 'coding_track_id');
    }

    public function progress(): HasMany
    {
        return $this->hasMany(CodingLessonProgress::class, 'coding_lesson_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }
}
