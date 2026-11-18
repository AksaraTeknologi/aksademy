<?php

use App\Models\CodingLesson;
use App\Models\CodingLessonProgress;
use App\Models\CodingTrack;
use App\Models\User;
use Database\Seeders\StaffPermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'admin']);
    Role::firstOrCreate(['name' => 'staff']);
    Role::firstOrCreate(['name' => 'mentor']);
    Role::firstOrCreate(['name' => 'affiliate']);
    Role::firstOrCreate(['name' => 'user']);
    $this->seed(StaffPermissionSeeder::class);
});

function createAdminUser(): User
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('admin');

    return $user;
}

function createRegularUser(): User
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('user');

    return $user;
}

it('shows only active tracks on public index without full lessons payload', function () {
    $activeTrack = CodingTrack::create([
        'title' => 'HTML Dasar',
        'slug' => 'html-dasar',
        'description' => 'Belajar HTML dari awal',
        'level' => 'beginner',
        'is_active' => true,
        'sort_order' => 1,
    ]);

    CodingTrack::create([
        'title' => 'Draft Track',
        'slug' => 'draft-track',
        'level' => 'beginner',
        'is_active' => false,
        'sort_order' => 2,
    ]);

    CodingLesson::create([
        'coding_track_id' => $activeTrack->id,
        'title' => 'Materi Aktif',
        'slug' => 'materi-aktif',
        'content' => '<p>Halo</p>',
        'is_active' => true,
        'sort_order' => 1,
    ]);

    CodingLesson::create([
        'coding_track_id' => $activeTrack->id,
        'title' => 'Materi Draft',
        'slug' => 'materi-draft',
        'content' => '<p>Rahasia</p>',
        'is_active' => false,
        'sort_order' => 2,
    ]);

    $response = $this->get(route('coding-playground.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('user/coding-playground/index')
        ->has('tracks', 1)
        ->where('tracks.0.slug', 'html-dasar')
        ->where('tracks.0.active_lessons_count', 1)
        ->missing('tracks.0.lessons')
    );
});

it('shows only active lessons ordered by sort_order on track detail and blocks draft tracks', function () {
    $track = CodingTrack::create([
        'title' => 'CSS Dasar',
        'slug' => 'css-dasar',
        'level' => 'beginner',
        'is_active' => true,
        'sort_order' => 1,
    ]);

    CodingLesson::create([
        'coding_track_id' => $track->id,
        'title' => 'Materi Kedua',
        'slug' => 'materi-kedua',
        'content' => '<p>Dua</p>',
        'is_active' => true,
        'sort_order' => 2,
    ]);

    CodingLesson::create([
        'coding_track_id' => $track->id,
        'title' => 'Materi Pertama',
        'slug' => 'materi-pertama',
        'content' => '<p>Satu</p>',
        'is_active' => true,
        'sort_order' => 1,
    ]);

    CodingLesson::create([
        'coding_track_id' => $track->id,
        'title' => 'Materi Draft',
        'slug' => 'materi-draft',
        'content' => '<p>Draft</p>',
        'is_active' => false,
        'sort_order' => 3,
    ]);

    $response = $this->get(route('coding-playground.track', $track->slug));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('user/coding-playground/track')
        ->has('lessons', 2)
        ->where('lessons.0.slug', 'materi-pertama')
        ->where('lessons.1.slug', 'materi-kedua')
    );

    $draftTrack = CodingTrack::create([
        'title' => 'Draft Track',
        'slug' => 'draft-css',
        'level' => 'beginner',
        'is_active' => false,
        'sort_order' => 2,
    ]);

    $this->get(route('coding-playground.track', $draftTrack->slug))->assertNotFound();
});

it('blocks draft lessons from public access and scopes duplicate lesson slugs per track', function () {
    $trackHtml = CodingTrack::create([
        'title' => 'HTML',
        'slug' => 'html',
        'level' => 'beginner',
        'is_active' => true,
        'sort_order' => 1,
    ]);

    $trackCss = CodingTrack::create([
        'title' => 'CSS',
        'slug' => 'css',
        'level' => 'beginner',
        'is_active' => true,
        'sort_order' => 2,
    ]);

    CodingLesson::create([
        'coding_track_id' => $trackHtml->id,
        'title' => 'Pengenalan HTML',
        'slug' => 'pengenalan',
        'content' => '<p>HTML intro</p><script>alert(1)</script>',
        'starter_html' => '<h1>HTML</h1>',
        'starter_css' => '',
        'starter_js' => 'console.log("html");',
        'is_active' => true,
        'sort_order' => 1,
    ]);

    CodingLesson::create([
        'coding_track_id' => $trackCss->id,
        'title' => 'Pengenalan CSS',
        'slug' => 'pengenalan',
        'content' => '<p>CSS intro</p>',
        'starter_html' => '<div class="box">CSS</div>',
        'starter_css' => '.box { color: red; }',
        'starter_js' => '',
        'is_active' => true,
        'sort_order' => 1,
    ]);

    $draftLesson = CodingLesson::create([
        'coding_track_id' => $trackHtml->id,
        'title' => 'Draft HTML',
        'slug' => 'draft-html',
        'content' => '<p>Hidden</p>',
        'is_active' => false,
        'sort_order' => 2,
    ]);

    // Scoped lookup for CSS track with same slug 'pengenalan'
    $this->get(route('coding-playground.lesson', [$trackCss->slug, 'pengenalan']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/coding-playground/lesson')
            ->where('track.slug', 'css')
            ->where('lesson.title', 'Pengenalan CSS')
            ->where('lesson.starter_css', '.box { color: red; }')
        );

    // Content sanitized while starter_js remains raw code
    $this->get(route('coding-playground.lesson', [$trackHtml->slug, 'pengenalan']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('lesson.content', '<p>HTML intro</p>')
            ->where('lesson.starter_html', '<h1>HTML</h1>')
            ->where('lesson.starter_js', 'console.log("html");')
        );

    // Draft lesson cannot be accessed publicly
    $this->get(route('coding-playground.lesson', [$trackHtml->slug, $draftLesson->slug]))
        ->assertNotFound();
});

it('requires authentication for progress endpoints and prevents cross-user manipulation', function () {
    $track = CodingTrack::create([
        'title' => 'JavaScript',
        'slug' => 'javascript',
        'level' => 'beginner',
        'is_active' => true,
        'sort_order' => 1,
    ]);

    $lesson = CodingLesson::create([
        'coding_track_id' => $track->id,
        'title' => 'Variabel JS',
        'slug' => 'variabel-js',
        'content' => '<p>Let dan Const</p>',
        'is_active' => true,
        'sort_order' => 1,
    ]);

    // Guest cannot call progress endpoints
    $this->post(route('coding-playground.lesson.complete', [$track->slug, $lesson->slug]))
        ->assertRedirect(route('login'));

    $this->delete(route('coding-playground.lesson.uncomplete', [$track->slug, $lesson->slug]))
        ->assertRedirect(route('login'));

    $userA = createRegularUser();
    $userB = createRegularUser();

    // User A marks complete even if forging user_id in payload -> still attributed to User A
    $this->actingAs($userA)
        ->postJson(route('coding-playground.lesson.complete', [$track->slug, $lesson->slug]), [
            'user_id' => $userB->id,
        ])
        ->assertOk()
        ->assertJson(['completed' => true, 'coding_lesson_id' => $lesson->id]);

    // Idempotent second POST (updateOrCreate handles unique constraint)
    $this->actingAs($userA)
        ->postJson(route('coding-playground.lesson.complete', [$track->slug, $lesson->slug]))
        ->assertOk();

    expect(CodingLessonProgress::where('user_id', $userA->id)->where('coding_lesson_id', $lesson->id)->count())->toBe(1);
    expect(CodingLessonProgress::where('user_id', $userB->id)->where('coding_lesson_id', $lesson->id)->count())->toBe(0);

    // User B marks complete too
    $this->actingAs($userB)
        ->postJson(route('coding-playground.lesson.complete', [$track->slug, $lesson->slug]))
        ->assertOk();

    // User A uncompletes -> only User A's progress is removed, User B's remains
    $this->actingAs($userA)
        ->deleteJson(route('coding-playground.lesson.uncomplete', [$track->slug, $lesson->slug]))
        ->assertOk()
        ->assertJson(['completed' => false]);

    expect(CodingLessonProgress::where('user_id', $userA->id)->where('coding_lesson_id', $lesson->id)->exists())->toBeFalse();
    expect(CodingLessonProgress::where('user_id', $userB->id)->where('coding_lesson_id', $lesson->id)->exists())->toBeTrue();
});

it('enforces admin authorization and supports full CRUD, validation, duplicate, reorder, and cascade delete', function () {
    Storage::fake('public');

    $regularUser = createRegularUser();
    $admin = createAdminUser();

    // Regular user cannot access admin routes
    $this->actingAs($regularUser)
        ->get(route('admin.coding-playground.tracks.index'))
        ->assertForbidden();

    // Staff with view-only permission can view index but cannot create
    $staff = User::factory()->create(['email_verified_at' => now()]);
    $staff->assignRole('staff');
    $staff->givePermissionTo('coding-playground.view');

    $this->actingAs($staff)->get(route('admin.coding-playground.tracks.index'))->assertOk();
    $this->actingAs($staff)->get(route('admin.coding-playground.tracks.create'))->assertForbidden();

    // Admin creates track with thumbnail
    $thumbnail = UploadedFile::fake()->image('html-track.png', 640, 360);
    $this->actingAs($admin)
        ->post(route('admin.coding-playground.tracks.store'), [
            'title' => 'HTML Mastery',
            'slug' => 'html-mastery',
            'description' => 'Belajar HTML terstruktur',
            'level' => 'beginner',
            'sort_order' => 1,
            'is_active' => true,
            'thumbnail' => $thumbnail,
        ])
        ->assertRedirect(route('admin.coding-playground.tracks.index'));

    $track = CodingTrack::where('slug', 'html-mastery')->firstOrFail();
    expect($track->thumbnail)->not->toBeNull();
    Storage::disk('public')->assertExists($track->thumbnail);

    // Validation: duplicate slug and invalid level fail
    $this->actingAs($admin)
        ->post(route('admin.coding-playground.tracks.store'), [
            'title' => 'HTML Mastery 2',
            'slug' => 'html-mastery',
            'level' => 'invalid-level',
        ])
        ->assertSessionHasErrors(['slug', 'level']);

    // Admin creates lesson with XSS payload in content + raw starter JS
    $this->actingAs($admin)
        ->post(route('admin.coding-playground.lessons.store'), [
            'coding_track_id' => $track->id,
            'title' => 'Tag Heading',
            'slug' => 'tag-heading',
            'content' => '<h2>Heading</h2><script>evil()</script><p onclick="bad()">Paragraf</p>',
            'starter_html' => '<h1>Halo</h1>',
            'starter_css' => 'h1 { color: navy; }',
            'starter_js' => 'document.querySelector("h1").dataset.ok = "<script>safe-text</script>";',
            'instructions' => 'Ubah h1 menjadi namamu.',
            'is_active' => true,
            'sort_order' => 1,
        ])
        ->assertRedirect(route('admin.coding-playground.lessons.index', ['track_id' => $track->id]));

    $lesson = CodingLesson::where('coding_track_id', $track->id)->where('slug', 'tag-heading')->firstOrFail();
    expect($lesson->content)->not->toContain('<script')
        ->not->toContain('onclick')
        ->toContain('<h2>Heading</h2>');
    expect($lesson->starter_js)->toContain('<script>safe-text</script>');

    // Unique slug per track validation
    $this->actingAs($admin)
        ->post(route('admin.coding-playground.lessons.store'), [
            'coding_track_id' => $track->id,
            'title' => 'Tag Heading Lain',
            'slug' => 'tag-heading',
            'content' => '<p>Konten</p>',
        ])
        ->assertSessionHasErrors(['slug']);

    // Duplicate lesson creates draft copy
    $this->actingAs($admin)
        ->post(route('admin.coding-playground.lessons.duplicate', $lesson->id))
        ->assertRedirect();

    $duplicated = CodingLesson::where('coding_track_id', $track->id)->where('id', '!=', $lesson->id)->firstOrFail();
    expect($duplicated->is_active)->toBeFalse();
    expect($duplicated->sort_order)->toBe(2);

    // Reorder lessons persists sort_order
    $this->actingAs($admin)
        ->post(route('admin.coding-playground.lessons.reorder'), [
            'items' => [
                ['id' => $duplicated->id, 'sort_order' => 1],
                ['id' => $lesson->id, 'sort_order' => 2],
            ],
        ])
        ->assertRedirect();

    expect($duplicated->fresh()->sort_order)->toBe(1);
    expect($lesson->fresh()->sort_order)->toBe(2);

    // Verify Eloquent relationships & cascade delete
    CodingLessonProgress::create([
        'user_id' => $regularUser->id,
        'coding_lesson_id' => $lesson->id,
        'completed_at' => now(),
    ]);

    expect($track->lessons)->toHaveCount(2);
    expect($lesson->track->id)->toBe($track->id);
    expect($lesson->progress)->toHaveCount(1);
    expect($regularUser->codingLessonProgress)->toHaveCount(1);
    expect($regularUser->codingLessonProgress->first()->lesson->id)->toBe($lesson->id);

    $thumbnailPath = $track->thumbnail;
    $this->actingAs($admin)
        ->delete(route('admin.coding-playground.tracks.destroy', $track->id))
        ->assertRedirect(route('admin.coding-playground.tracks.index'));

    Storage::disk('public')->assertMissing($thumbnailPath);
    expect(CodingTrack::find($track->id))->toBeNull();
    expect(CodingLesson::where('coding_track_id', $track->id)->count())->toBe(0);
    expect(CodingLessonProgress::where('coding_lesson_id', $lesson->id)->count())->toBe(0);
});

it('keeps existing public aksademy pages working without regression', function () {
    $this->get('/')->assertOk();
    $this->get('/course')->assertOk();
    $this->get('/bootcamp')->assertOk();
    $this->get('/webinar')->assertOk();
    $this->get('/bundle')->assertOk();
    $this->get('/certification-programs')->assertOk();
    $this->get('/check-certificate')->assertOk();
    $this->get('/login')->assertOk();
    $this->get('/register')->assertOk();
});

it('enforces role and permission matrix across mentor, affiliate, staff view, staff manage, and avoids N+1 queries', function () {
    $mentor = User::factory()->create(['email_verified_at' => now()]);
    $mentor->assignRole('mentor');

    $affiliate = User::factory()->create(['email_verified_at' => now()]);
    $affiliate->assignRole('affiliate');

    $staffNoPerm = User::factory()->create(['email_verified_at' => now()]);
    $staffNoPerm->assignRole('staff');

    $staffManageOnly = User::factory()->create(['email_verified_at' => now()]);
    $staffManageOnly->assignRole('staff');
    $staffManageOnly->givePermissionTo('coding-playground.manage');

    // Mentor, Affiliate, and Staff without permission cannot access index or create
    foreach ([$mentor, $affiliate, $staffNoPerm] as $actor) {
        $this->actingAs($actor)->get(route('admin.coding-playground.tracks.index'))->assertForbidden();
        $this->actingAs($actor)->get(route('admin.coding-playground.lessons.index'))->assertForbidden();
        $this->actingAs($actor)->get(route('admin.coding-playground.tracks.create'))->assertForbidden();
    }

    // Staff with manage permission can view index and create
    $this->actingAs($staffManageOnly)->get(route('admin.coding-playground.tracks.index'))->assertOk();
    $this->actingAs($staffManageOnly)->get(route('admin.coding-playground.lessons.index'))->assertOk();
    $this->actingAs($staffManageOnly)->get(route('admin.coding-playground.tracks.create'))->assertOk();

    // Query count check (no N+1) across multiple tracks & lessons
    for ($t = 1; $t <= 5; $t++) {
        $track = CodingTrack::create([
            'title' => "Track {$t}",
            'slug' => "track-{$t}",
            'level' => 'beginner',
            'is_active' => true,
            'sort_order' => $t,
        ]);

        for ($l = 1; $l <= 5; $l++) {
            CodingLesson::create([
                'coding_track_id' => $track->id,
                'title' => "Lesson {$t}-{$l}",
                'slug' => "lesson-{$t}-{$l}",
                'content' => '<p>Body</p>',
                'is_active' => true,
                'sort_order' => $l,
            ]);
        }
    }

    \Illuminate\Support\Facades\DB::enableQueryLog();
    \Illuminate\Support\Facades\DB::flushQueryLog();
    $this->get(route('coding-playground.index'))->assertOk();
    $indexQueries = count(\Illuminate\Support\Facades\DB::getQueryLog());

    \Illuminate\Support\Facades\DB::flushQueryLog();
    $this->get(route('coding-playground.track', 'track-1'))->assertOk();
    $trackQueries = count(\Illuminate\Support\Facades\DB::getQueryLog());

    \Illuminate\Support\Facades\DB::flushQueryLog();
    $this->get(route('coding-playground.lesson', ['track-1', 'lesson-1-1']))->assertOk();
    $lessonQueries = count(\Illuminate\Support\Facades\DB::getQueryLog());
    \Illuminate\Support\Facades\DB::disableQueryLog();

    expect($indexQueries)->toBeLessThanOrEqual(2);
    expect($trackQueries)->toBeLessThanOrEqual(3);
    expect($lessonQueries)->toBeLessThanOrEqual(4);
});
