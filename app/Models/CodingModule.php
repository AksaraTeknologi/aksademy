<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CodingModule extends Model
{
    use HasFactory;

    protected $fillable = [
        'coding_track_id',
        'title',
        'description',
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

    public function lessons(): HasMany
    {
        return $this->hasMany(CodingLesson::class, 'coding_module_id')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function activeLessons(): HasMany
    {
        return $this->lessons()->where('is_active', true);
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
