<?php

namespace App\Http\Requests\Admin;

use App\Models\CodingLesson;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateCodingLessonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $slugSource = $this->filled('slug') ? $this->input('slug') : $this->input('title');

        if (is_string($slugSource) && trim($slugSource) !== '') {
            $this->merge([
                'slug' => Str::slug($slugSource),
            ]);
        }

        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false,
            ]);
        }
    }

    public function rules(): array
    {
        $lesson = $this->route('lesson');
        $lessonId = $lesson instanceof CodingLesson ? $lesson->id : $lesson;
        $trackId = $this->input('coding_track_id');

        return [
            'coding_track_id' => ['required', 'integer', 'exists:coding_tracks,id'],
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('coding_lessons', 'slug')
                    ->where(fn ($query) => $query->where('coding_track_id', $trackId))
                    ->ignore($lessonId),
            ],
            'content' => ['required', 'string', 'max:500000'],
            'starter_html' => ['nullable', 'string', 'max:200000'],
            'starter_css' => ['nullable', 'string', 'max:200000'],
            'starter_js' => ['nullable', 'string', 'max:200000'],
            'instructions' => ['nullable', 'string', 'max:20000'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
