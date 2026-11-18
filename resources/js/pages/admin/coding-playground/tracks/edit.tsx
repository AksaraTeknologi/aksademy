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
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface CodingTrackData {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    level: string;
    sort_order: number;
    is_active: boolean;
}

interface AdminCodingTrackEditProps {
    track: CodingTrackData;
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

export default function AdminCodingTrackEdit({ track }: AdminCodingTrackEditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Manajemen Coding Playground',
            href: route('admin.coding-playground.tracks.index'),
        },
        {
            title: track.title,
            href: route('admin.coding-playground.tracks.edit', track.id),
        },
    ];

    const [previewUrl, setPreviewUrl] = useState<string | null>(track.thumbnail ? `/storage/${track.thumbnail}` : null);

    const { data, setData, processing, errors } = useForm<{
        title: string;
        slug: string;
        description: string;
        level: string;
        sort_order: number;
        is_active: boolean;
        thumbnail: File | null;
        remove_thumbnail: boolean;
    }>({
        title: track.title,
        slug: track.slug,
        description: track.description ?? '',
        level: track.level,
        sort_order: track.sort_order,
        is_active: track.is_active,
        thumbnail: null,
        remove_thumbnail: false,
    });

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file) {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                toast.error('Format thumbnail harus JPG, JPEG, PNG, atau WEBP.');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                toast.error('Ukuran thumbnail maksimal 2 MB.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => setPreviewUrl((ev.target?.result as string) ?? null);
            reader.readAsDataURL(file);
            setData((prev) => ({ ...prev, thumbnail: file, remove_thumbnail: false }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            route('admin.coding-playground.tracks.update', track.id),
            {
                ...data,
                _method: 'put',
            },
            {
                forceFormData: true,
            },
        );
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${track.title} - Coding Playground`} />

            <div className="mx-auto max-w-3xl space-y-6 px-4 py-4 md:px-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={route('admin.coding-playground.tracks.index')}>
                            <ArrowLeft className="h-4 w-4" />
                            <span>Kembali</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold">Edit Program</h1>
                        <p className="text-muted-foreground text-sm">Perbarui informasi program {track.title}.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Detail Program</CardTitle>
                        <CardDescription>Ubah detail, level, thumbnail, atau status publikasi program.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Judul Program</Label>
                                    <Input
                                        id="title"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.title} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="slug">Slug URL</Label>
                                    <Input
                                        id="slug"
                                        value={data.slug}
                                        onChange={(e) => setData('slug', slugify(e.target.value))}
                                        required
                                    />
                                    <InputError message={errors.slug} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Deskripsi</Label>
                                <Textarea
                                    id="description"
                                    rows={3}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                />
                                <InputError message={errors.description} />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="level">Level Pembelajaran</Label>
                                    <Select value={data.level} onValueChange={(value) => setData('level', value)}>
                                        <SelectTrigger id="level">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="beginner">Pemula (Beginner)</SelectItem>
                                            <SelectItem value="intermediate">Menengah (Intermediate)</SelectItem>
                                            <SelectItem value="advanced">Mahir (Advanced)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.level} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="sort_order">Urutan Tampil</Label>
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
                                <Label htmlFor="thumbnail">Thumbnail</Label>
                                <Input
                                    id="thumbnail"
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    onChange={handleThumbnailChange}
                                />
                                <p className="text-muted-foreground text-xs">Format JPG, JPEG, PNG, WEBP. Maksimal 2 MB.</p>
                                <InputError message={errors.thumbnail} />
                                {previewUrl && (
                                    <div className="mt-2 flex items-start gap-3">
                                        <img src={previewUrl} alt="Thumbnail" className="h-32 rounded-lg border object-cover" />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setPreviewUrl(null);
                                                setData((prev) => ({ ...prev, thumbnail: null, remove_thumbnail: true }));
                                            }}
                                            className="text-destructive gap-1"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span>Hapus Thumbnail</span>
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <Label htmlFor="is_active" className="text-sm font-medium">
                                        Publikasikan Program
                                    </Label>
                                    <p className="text-muted-foreground text-xs">
                                        Program nonaktif tidak akan muncul di halaman publik.
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
                                    <Link href={route('admin.coding-playground.tracks.index')}>Batal</Link>
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
