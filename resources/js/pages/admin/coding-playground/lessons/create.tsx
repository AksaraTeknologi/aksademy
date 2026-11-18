import { Button } from '@/components/ui/button';
import AdminLayout from '@/layouts/admin-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import LessonForm, { type ModuleOption, type TrackOption } from './lesson-form';

interface AdminCodingLessonCreateProps {
    tracks: TrackOption[];
    modules: ModuleOption[];
    defaultTrackId: string;
    defaultModuleId?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manajemen Coding Playground',
        href: route('admin.coding-playground.tracks.index'),
    },
    {
        title: 'Materi',
        href: route('admin.coding-playground.lessons.index'),
    },
    {
        title: 'Tambah Materi',
        href: route('admin.coding-playground.lessons.create'),
    },
];

export default function AdminCodingLessonCreate({
    tracks,
    modules,
    defaultTrackId,
    defaultModuleId = '',
}: AdminCodingLessonCreateProps) {
    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Tambah Materi - Coding Playground" />

            <div className="mx-auto max-w-5xl space-y-6 px-4 py-4 md:px-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={route('admin.coding-playground.lessons.index')}>
                            <ArrowLeft className="h-4 w-4" />
                            <span>Kembali</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold">Tambah Materi</h1>
                        <p className="text-muted-foreground text-sm">Buat materi pembelajaran beserta starter code HTML, CSS, dan JavaScript.</p>
                    </div>
                </div>

                <LessonForm
                    tracks={tracks}
                    modules={modules}
                    initialData={{
                        coding_track_id: defaultTrackId,
                        coding_module_id: defaultModuleId,
                        title: '',
                        slug: '',
                        content: '',
                        starter_html: '<h1>Halo Aksademy!</h1>\n<p>Mulai tulis kode di sini.</p>',
                        starter_css: 'body {\n  font-family: sans-serif;\n}',
                        starter_js: '',
                        instructions: '',
                        is_active: true,
                        sort_order: 0,
                    }}
                    submitUrl={route('admin.coding-playground.lessons.store')}
                    method="post"
                    submitLabel="Simpan Materi"
                />
            </div>
        </AdminLayout>
    );
}
