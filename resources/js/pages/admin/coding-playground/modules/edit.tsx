import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/layouts/admin-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';

interface TrackOption {
    id: number;
    title: string;
}

interface CodingModuleData {
    id: number;
    coding_track_id: number;
    title: string;
    description: string | null;
    sort_order: number;
    is_active: boolean;
}

interface AdminCodingModuleEditProps {
    module: CodingModuleData;
    tracks: TrackOption[];
}

export default function AdminCodingModuleEdit({ module, tracks }: AdminCodingModuleEditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Manajemen Coding Playground',
            href: route('admin.coding-playground.tracks.index'),
        },
        {
            title: 'Bab',
            href: route('admin.coding-playground.modules.index', { track_id: module.coding_track_id }),
        },
        {
            title: module.title,
            href: route('admin.coding-playground.modules.edit', module.id),
        },
    ];

    const { data, setData, put, processing, errors } = useForm({
        coding_track_id: String(module.coding_track_id),
        title: module.title,
        description: module.description ?? '',
        sort_order: module.sort_order,
        is_active: module.is_active,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.coding-playground.modules.update', module.id));
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${module.title} - Coding Playground`} />

            <div className="mx-auto max-w-3xl space-y-6 px-4 py-4 md:px-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={route('admin.coding-playground.modules.index', { track_id: module.coding_track_id })}>
                            <ArrowLeft className="h-4 w-4" />
                            <span>Kembali</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold">Edit Bab</h1>
                        <p className="text-muted-foreground text-sm">Perbarui informasi bab {module.title}.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detail Bab</CardTitle>
                        <CardDescription>Ubah program, judul, deskripsi, urutan, atau status publikasi bab.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="coding_track_id">Program</Label>
                                    <Select value={data.coding_track_id} onValueChange={(value) => setData('coding_track_id', value)}>
                                        <SelectTrigger id="coding_track_id">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tracks.map((track) => (
                                                <SelectItem key={track.id} value={String(track.id)}>
                                                    {track.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.coding_track_id} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sort_order">Urutan Bab</Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        min={0}
                                        value={data.sort_order}
                                        onChange={(e) => setData('sort_order', Number(e.target.value) || 0)}
                                    />
                                    <InputError message={errors.sort_order} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title">Judul Bab</Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    required
                                />
                                <InputError message={errors.title} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                                <Textarea
                                    id="description"
                                    rows={3}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                />
                                <InputError message={errors.description} />
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <Label htmlFor="is_active" className="text-sm font-medium">
                                        Publikasikan Bab
                                    </Label>
                                    <p className="text-muted-foreground text-xs">
                                        Bab nonaktif beserta materi di dalamnya tidak akan ditampilkan ke publik.
                                    </p>
                                </div>
                                <Switch
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) => setData('is_active', checked)}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" type="button" asChild>
                                    <Link href={route('admin.coding-playground.modules.index', { track_id: module.coding_track_id })}>
                                        Batal
                                    </Link>
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    <Save className="h-4 w-4" />
                                    <span>{processing ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
