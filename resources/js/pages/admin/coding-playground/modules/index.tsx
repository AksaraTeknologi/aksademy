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
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Edit, Layers, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface TrackOption {
    id: number;
    title: string;
    slug: string;
    is_active: boolean;
}

interface CodingModuleRow {
    id: number;
    coding_track_id: number;
    title: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    lessons_count: number;
    active_lessons_count: number;
    track: TrackOption | null;
}

interface AdminModulesIndexProps {
    modules: PaginatedData<CodingModuleRow>;
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
        title: 'Bab',
        href: route('admin.coding-playground.modules.index'),
    },
];

export default function AdminCodingModulesIndex({ modules, tracks, filters, flash }: AdminModulesIndexProps) {
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
            route('admin.coding-playground.modules.index'),
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

    const handleToggleStatus = (mod: CodingModuleRow) => {
        router.patch(
            route('admin.coding-playground.modules.toggle-status', mod.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Status bab berhasil diperbarui.'),
            },
        );
    };

    const handleDelete = (mod: CodingModuleRow) => {
        router.delete(route('admin.coding-playground.modules.destroy', mod.id), {
            preserveScroll: true,
            onSuccess: () => toast.success('Bab berhasil dihapus.'),
        });
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const current = modules.data[index];
        const target = modules.data[targetIndex];

        if (!current || !target || current.coding_track_id !== target.coding_track_id) {
            return;
        }

        const reordered = [...modules.data];
        reordered[index] = target;
        reordered[targetIndex] = current;

        const sameTrackItems = reordered
            .filter((item) => item.coding_track_id === current.coding_track_id)
            .map((item, idx) => ({
                id: item.id,
                sort_order: idx + 1,
            }));

        router.post(
            route('admin.coding-playground.modules.reorder'),
            { items: sameTrackItems },
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Urutan bab disimpan.'),
            },
        );
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Manajemen Coding Playground - Bab" />

            <div className="space-y-6 px-4 py-4 md:px-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                        <Button variant="ghost" size="sm" asChild className="-ml-2">
                            <Link href={route('admin.coding-playground.tracks.index')}>
                                <ArrowLeft className="h-4 w-4" />
                                <span>Program</span>
                            </Link>
                        </Button>
                        <h1 className="text-2xl font-semibold">Bab Coding Playground</h1>
                        <p className="text-muted-foreground text-sm">
                            Kelompokkan materi ke dalam beberapa bab agar kurikulum tersusun rapi.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('admin.coding-playground.lessons.index', { track_id: selectedTrackId || undefined })}>
                                <BookOpen className="h-4 w-4" />
                                <span>Kelola Materi</span>
                            </Link>
                        </Button>
                        {canManagePlayground && (
                            <Button asChild>
                                <Link
                                    href={route('admin.coding-playground.modules.create', {
                                        track_id: selectedTrackId || undefined,
                                    })}
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Tambah Bab</span>
                                </Link>
                            </Button>
                        )}
                    </div>
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
                                placeholder="Cari judul bab..."
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
                                <TableHead>Judul Bab</TableHead>
                                <TableHead>Program</TableHead>
                                <TableHead>Materi</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {modules.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-muted-foreground h-28 text-center">
                                        Belum ada bab Coding Playground.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                modules.data.map((mod, idx) => {
                                    const canMoveUp =
                                        canManagePlayground &&
                                        idx > 0 &&
                                        modules.data[idx - 1]?.coding_track_id === mod.coding_track_id;
                                    const canMoveDown =
                                        canManagePlayground &&
                                        idx < modules.data.length - 1 &&
                                        modules.data[idx + 1]?.coding_track_id === mod.coding_track_id;

                                    return (
                                        <TableRow key={mod.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <span className="w-6 font-mono text-xs">{mod.sort_order}</span>
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
                                                <div className="font-medium">{mod.title}</div>
                                                {mod.description && (
                                                    <div className="text-muted-foreground line-clamp-1 text-xs">{mod.description}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{mod.track?.title ?? '-'}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Link
                                                    href={route('admin.coding-playground.lessons.index', {
                                                        track_id: mod.coding_track_id,
                                                        module_id: mod.id,
                                                    })}
                                                    className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                                                >
                                                    <Layers className="h-3.5 w-3.5" />
                                                    <span>
                                                        {mod.active_lessons_count} aktif / {mod.lessons_count} total
                                                    </span>
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={mod.is_active}
                                                        disabled={!canManagePlayground}
                                                        onCheckedChange={() => handleToggleStatus(mod)}
                                                        aria-label={`Publikasi ${mod.title}`}
                                                    />
                                                    <span className="text-xs font-medium">
                                                        {mod.is_active ? 'Aktif' : 'Draft'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="sm" asChild title="Lihat materi bab">
                                                        <Link
                                                            href={route('admin.coding-playground.lessons.index', {
                                                                track_id: mod.coding_track_id,
                                                                module_id: mod.id,
                                                            })}
                                                        >
                                                            <BookOpen className="h-4 w-4" />
                                                            <span className="sr-only">Materi</span>
                                                        </Link>
                                                    </Button>
                                                    {canManagePlayground && (
                                                        <>
                                                            <Button variant="ghost" size="sm" asChild title="Edit bab">
                                                                <Link href={route('admin.coding-playground.modules.edit', mod.id)}>
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
                                                                title="Hapus Bab?"
                                                                description={`Bab "${mod.title}" akan dihapus. Materi di dalamnya tetap tersimpan sebagai materi tanpa bab.`}
                                                                onConfirm={() => handleDelete(mod)}
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
            </div>
        </AdminLayout>
    );
}
