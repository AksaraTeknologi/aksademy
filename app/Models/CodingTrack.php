<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CodingTrack extends Model
{
    use HasFactory;

    public const LEVELS = ['beginner', 'intermediate', 'advanced'];

    protected $fillable = [
        'title',
        'slug',
        'description',
        'thumbnail',
        'level',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function modules(): HasMany
    {
        return $this->hasMany(CodingModule::class, 'coding_track_id')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function activeModules(): HasMany
    {
        return $this->modules()->where('is_active', true);
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(CodingLesson::class, 'coding_track_id')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function activeLessons(): HasMany
    {
        return $this->lessons()
            ->where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('coding_module_id')
                    ->orWhereHas('module', fn ($moduleQuery) => $moduleQuery->where('is_active', true));
            });
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
