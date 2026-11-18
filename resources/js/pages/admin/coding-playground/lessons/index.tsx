import DeleteConfirmDialog from '@/components/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/use-permission';
import AdminLayout from '@/layouts/admin-layout';
import { type BreadcrumbItem } from '@/types';
import { type PaginatedData } from '@/types/pagination';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Edit, ExternalLink, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface TrackOption {
    id: number;
    title: string;
    slug: string;
    is_active: boolean;
}

interface CodingLessonRow {
    id: number;
    coding_track_id: number;
    title: string;
    slug: string;
    is_active: boolean;
    sort_order: number;
    track: TrackOption | null;
}

interface AdminLessonsIndexProps {
    lessons: PaginatedData<CodingLessonRow>;
    tracks: TrackOption[];
    filters: {
        track_id?: string;
        search?: string;
        per_page?: number;
    };
    flash?: {
        success?: string;
        error?: string;
    };
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
];

export default function AdminCodingLessonsIndex({ lessons, tracks, filters, flash }: AdminLessonsIndexProps) {
    const { canManage } = usePermission();
    const canManagePlayground = canManage('coding-playground');
    const [search, setSearch] = useState(filters.search ?? '');
    const selectedTrackId = filters.track_id ?? '';

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const applyFilters = (nextTrackId: string, nextSearch: string) => {
        router.get(
            route('admin.coding-playground.lessons.index'),
            {
                track_id: nextTrackId || undefined,
                search: nextSearch || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters(selectedTrackId, search);
    };

    const handleToggleStatus = (lesson: CodingLessonRow) => {
        router.patch(
            route('admin.coding-playground.lessons.toggle-status', lesson.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Status materi berhasil diperbarui.'),
            },
        );
    };

    const handleDuplicate = (lesson: CodingLessonRow) => {
        router.post(
            route('admin.coding-playground.lessons.duplicate', lesson.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Materi berhasil diduplikasi sebagai draft.'),
            },
        );
    };

    const handleDelete = (lesson: CodingLessonRow) => {
        router.delete(route('admin.coding-playground.lessons.destroy', lesson.id), {
            preserveScroll: true,
            onSuccess: () => toast.success('Materi berhasil dihapus.'),
        });
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const current = lessons.data[index];
        const target = lessons.data[targetIndex];

        if (!current || !target || current.coding_track_id !== target.coding_track_id) {
            return;
        }

        const reordered = [...lessons.data];
        reordered[index] = target;
        reordered[targetIndex] = current;

        const sameTrackItems = reordered
            .filter((item) => item.coding_track_id === current.coding_track_id)
            .map((item, idx) => ({
                id: item.id,
                sort_order: idx + 1,
            }));

        router.post(
            route('admin.coding-playground.lessons.reorder'),
            { items: sameTrackItems },
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Urutan materi disimpan.'),
            },
        );
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Manajemen Coding Playground - Materi" />

            <div className="space-y-6 px-4 py-4 md:px-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" asChild className="-ml-2">
                                <Link href={route('admin.coding-playground.tracks.index')}>
                                    <ArrowLeft className="h-4 w-4" />
                                    <span>Program</span>
                                </Link>
                            </Button>
                        </div>
                        <h1 className="text-2xl font-semibold">Materi Coding Playground</h1>
                        <p className="text-muted-foreground text-sm">
                            Kelola materi, starter code HTML/CSS/JS, status publikasi, dan urutan materi.
                        </p>
                    </div>

                    {canManagePlayground && (
                        <Button asChild>
                            <Link
                                href={route('admin.coding-playground.lessons.create', {
                                    track_id: selectedTrackId || undefined,
                                })}
                            >
                                <Plus className="h-4 w-4" />
                                <span>Tambah Materi</span>
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="w-full sm:w-64">
                        <Select
                            value={selectedTrackId || 'all'}
                            onValueChange={(val) => applyFilters(val === 'all' ? '' : val, search)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Semua Program" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Program</SelectItem>
                                {tracks.map((track) => (
                                    <SelectItem key={track.id} value={String(track.id)}>
                                        {track.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <form onSubmit={handleSearchSubmit} className="flex max-w-md flex-1 items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari judul atau slug materi..."
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" variant="secondary">
                            Cari
                        </Button>
                    </form>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-28">Urutan</TableHead>
                                <TableHead>Judul Materi</TableHead>
                                <TableHead>Program</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lessons.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-muted-foreground h-28 text-center">
                                        Belum ada materi Coding Playground.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                lessons.data.map((lesson, idx) => {
                                    const canMoveUp =
                                        canManagePlayground &&
                                        idx > 0 &&
                                        lessons.data[idx - 1]?.coding_track_id === lesson.coding_track_id;
                                    const canMoveDown =
                                        canManagePlayground &&
                                        idx < lessons.data.length - 1 &&
                                        lessons.data[idx + 1]?.coding_track_id === lesson.coding_track_id;

                                    return (
                                        <TableRow key={lesson.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <span className="w-6 font-mono text-xs">{lesson.sort_order}</span>
                                                    {canManagePlayground && (
                                                        <>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                disabled={!canMoveUp}
                                                                onClick={() => handleMove(idx, 'up')}
                                                                title="Naikkan urutan"
                                                            >
                                                                <ArrowUp className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                disabled={!canMoveDown}
                                                                onClick={() => handleMove(idx, 'down')}
                                                                title="Turunkan urutan"
                                                            >
                                                                <ArrowDown className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{lesson.title}</div>
                                                <div className="text-muted-foreground font-mono text-xs">/{lesson.slug}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{lesson.track?.title ?? '-'}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={lesson.is_active}
                                                        disabled={!canManagePlayground}
                                                        onCheckedChange={() => handleToggleStatus(lesson)}
                                                        aria-label={`Publikasi ${lesson.title}`}
                                                    />
                                                    <span className="text-xs font-medium">
                                                        {lesson.is_active ? 'Published' : 'Draft'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {lesson.is_active && lesson.track?.is_active && (
                                                        <Button variant="ghost" size="sm" asChild title="Buka halaman publik">
                                                            <a
                                                                href={route('coding-playground.lesson', [
                                                                    lesson.track.slug,
                                                                    lesson.slug,
                                                                ])}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                                <span className="sr-only">Lihat Publik</span>
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {canManagePlayground && (
                                                        <>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDuplicate(lesson)}
                                                                title="Duplikasi materi"
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                                <span className="sr-only">Duplikasi</span>
                                                            </Button>
                                                            <Button variant="ghost" size="sm" asChild title="Edit materi">
                                                                <Link href={route('admin.coding-playground.lessons.edit', lesson.id)}>
                                                                    <Edit className="h-4 w-4" />
                                                                    <span className="sr-only">Edit</span>
                                                                </Link>
                                                            </Button>
                                                            <DeleteConfirmDialog
                                                                trigger={
                                                                    <Button variant="ghost" size="sm" className="text-destructive">
                                                                        <Trash2 className="h-4 w-4" />
                                                                        <span className="sr-only">Hapus</span>
                                                                    </Button>
                                                                }
                                                                title="Hapus Materi Coding Playground?"
                                                                description={`Materi "${lesson.title}" dan progres belajar terkait akan dihapus permanen.`}
                                                                onConfirm={() => handleDelete(lesson)}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {lessons.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                            Halaman {lessons.current_page} dari {lessons.last_page}
                        </span>
                        <div className="flex gap-2">
                            {lessons.prev_page_url && (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={lessons.prev_page_url}>Sebelumnya</Link>
                                </Button>
                            )}
                            {lessons.next_page_url && (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={lessons.next_page_url}>Berikutnya</Link>
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
