import { Button } from '@/components/ui/button';
import AdminLayout from '@/layouts/admin-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import LessonForm, { type ModuleOption, type TrackOption } from './lesson-form';

interface CodingLessonModel {
    id: number;
    coding_track_id: number;
    coding_module_id: number | null;
    title: string;
    slug: string;
    content: string;
    starter_html: string | null;
    starter_css: string | null;
    starter_js: string | null;
    instructions: string | null;
    is_active: boolean;
    sort_order: number;
}

interface AdminCodingLessonEditProps {
    lesson: CodingLessonModel;
    tracks: TrackOption[];
    modules: ModuleOption[];
}

export default function AdminCodingLessonEdit({ lesson, tracks, modules }: AdminCodingLessonEditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Manajemen Coding Playground',
            href: route('admin.coding-playground.tracks.index'),
        },
        {
            title: 'Materi',
            href: route('admin.coding-playground.lessons.index', { track_id: lesson.coding_track_id }),
        },
        {
            title: lesson.title,
            href: route('admin.coding-playground.lessons.edit', lesson.id),
        },
    ];

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${lesson.title} - Coding Playground`} />

            <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 md:px-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={route('admin.coding-playground.lessons.index', { track_id: lesson.coding_track_id })}>
                            <ArrowLeft className="h-4 w-4" />
                            <span>Kembali</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold">Edit Materi</h1>
                        <p className="text-muted-foreground text-sm">Perbarui konten materi dan starter code untuk {lesson.title}.</p>
                    </div>
                </div>

                <LessonForm
                    tracks={tracks}
                    modules={modules}
                    initialData={{
                        id: lesson.id,
                        coding_track_id: String(lesson.coding_track_id),
                        coding_module_id: lesson.coding_module_id ? String(lesson.coding_module_id) : '',
                        title: lesson.title,
                        slug: lesson.slug,
                        content: lesson.content ?? '',
                        starter_html: lesson.starter_html ?? '',
                        starter_css: lesson.starter_css ?? '',
                        starter_js: lesson.starter_js ?? '',
                        instructions: lesson.instructions ?? '',
                        is_active: lesson.is_active,
                        sort_order: lesson.sort_order,
                    }}
                    submitUrl={route('admin.coding-playground.lessons.update', lesson.id)}
                    method="put"
                    submitLabel="Simpan Perubahan"
                />
            </div>
        </AdminLayout>
    );
}
