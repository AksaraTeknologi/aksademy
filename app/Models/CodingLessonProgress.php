<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodingLessonProgress extends Model
{
    use HasFactory;

    protected $table = 'coding_lesson_progress';

    protected $fillable = [
        'user_id',
        'coding_lesson_id',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'coding_lesson_id' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(CodingLesson::class, 'coding_lesson_id');
    }
}
