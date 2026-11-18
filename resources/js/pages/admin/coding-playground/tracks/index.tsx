import DeleteConfirmDialog from '@/components/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/hooks/use-permission';
import AdminLayout from '@/layouts/admin-layout';
import { type BreadcrumbItem } from '@/types';
import { type PaginatedData } from '@/types/pagination';
import { Head, Link, router } from '@inertiajs/react';
import { BookOpen, Code2, Edit, Layers, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface CodingTrackRow {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    level: 'beginner' | 'intermediate' | 'advanced' | string;
    is_active: boolean;
    sort_order: number;
    lessons_count: number;
    active_lessons_count: number;
}

interface AdminTracksIndexProps {
    tracks: PaginatedData<CodingTrackRow>;
    filters: {
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
        title: 'Program',
        href: route('admin.coding-playground.tracks.index'),
    },
];

const LEVEL_LABELS: Record<string, string> = {
    beginner: 'Pemula',
    intermediate: 'Menengah',
    advanced: 'Mahir',
};

export default function AdminCodingTracksIndex({ tracks, filters, flash }: AdminTracksIndexProps) {
    const { canManage } = usePermission();
    const canManagePlayground = canManage('coding-playground');
    const [search, setSearch] = useState(filters.search ?? '');

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('admin.coding-playground.tracks.index'),
            { search: search || undefined },
            { preserveState: true, replace: true },
        );
    };

    const handleToggleStatus = (track: CodingTrackRow) => {
        router.patch(
            route('admin.coding-playground.tracks.toggle-status', track.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Status program berhasil diperbarui.'),
            },
        );
    };

    const handleDelete = (track: CodingTrackRow) => {
        router.delete(route('admin.coding-playground.tracks.destroy', track.id), {
            preserveScroll: true,
            onSuccess: () => toast.success('Program berhasil dihapus.'),
        });
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Manajemen Coding Playground - Program" />

            <div className="space-y-6 px-4 py-4 md:px-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-semibold">Manajemen Coding Playground</h1>
                        <p className="text-muted-foreground text-sm">
                            Kelola program pembelajaran (seperti HTML, CSS, JavaScript) dan daftar materinya.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('admin.coding-playground.lessons.index')}>
                                <BookOpen className="h-4 w-4" />
                                <span>Kelola Materi</span>
                            </Link>
                        </Button>
                        {canManagePlayground && (
                            <Button asChild>
                                <Link href={route('admin.coding-playground.tracks.create')}>
                                    <Plus className="h-4 w-4" />
                                    <span>Tambah Program</span>
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSearchSubmit} className="flex max-w-md items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari program atau slug..."
                            className="pl-9"
                        />
                    </div>
                    <Button type="submit" variant="secondary">
                        Cari
                    </Button>
                </form>

                <div className="overflow-x-auto rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">Urutan</TableHead>
                                <TableHead className="w-24">Thumbnail</TableHead>
                                <TableHead>Program</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Materi</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tracks.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-muted-foreground h-28 text-center">
                                        Belum ada program Coding Playground.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tracks.data.map((track) => (
                                    <TableRow key={track.id}>
                                        <TableCell className="font-mono text-xs">{track.sort_order}</TableCell>
                                        <TableCell>
                                            {track.thumbnail ? (
                                                <img
                                                    src={`/storage/${track.thumbnail}`}
                                                    alt={track.title}
                                                    className="h-12 w-20 rounded border object-cover"
                                                />
                                            ) : (
                                                <div className="bg-muted text-muted-foreground flex h-12 w-20 items-center justify-center rounded border">
                                                    <Code2 className="h-5 w-5" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{track.title}</div>
                                            <div className="text-muted-foreground font-mono text-xs">/{track.slug}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{LEVEL_LABELS[track.level] ?? track.level}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={route('admin.coding-playground.lessons.index', { track_id: track.id })}
                                                className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                                            >
                                                <Layers className="h-3.5 w-3.5" />
                                                <span>
                                                    {track.active_lessons_count} aktif / {track.lessons_count} total
                                                </span>
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={track.is_active}
                                                    disabled={!canManagePlayground}
                                                    onCheckedChange={() => handleToggleStatus(track)}
                                                    aria-label={`Status ${track.title}`}
                                                />
                                                <span className="text-xs font-medium">
                                                    {track.is_active ? 'Aktif' : 'Draft'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={route('admin.coding-playground.lessons.index', { track_id: track.id })}>
                                                        <BookOpen className="h-4 w-4" />
                                                        <span className="sr-only">Materi</span>
                                                    </Link>
                                                </Button>
                                                {canManagePlayground && (
                                                    <>
                                                        <Button variant="ghost" size="sm" asChild>
                                                            <Link href={route('admin.coding-playground.tracks.edit', track.id)}>
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
                                                            title="Hapus Program Coding Playground?"
                                                            description={`Program "${track.title}" beserta seluruh materi di dalamnya akan dihapus permanen.`}
                                                            onConfirm={() => handleDelete(track)}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {tracks.last_page > 1 && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                            Halaman {tracks.current_page} dari {tracks.last_page}
                        </span>
                        <div className="flex gap-2">
                            {tracks.prev_page_url && (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={tracks.prev_page_url}>Sebelumnya</Link>
                                </Button>
                            )}
                            {tracks.next_page_url && (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={tracks.next_page_url}>Berikutnya</Link>
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
