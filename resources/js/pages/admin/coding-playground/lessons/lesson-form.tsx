import { type EditorLanguage } from '@/components/coding-playground/code-editor-pane';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAppearance } from '@/hooks/use-appearance';
import { Link, useForm } from '@inertiajs/react';
import { Editor } from '@tinymce/tinymce-react';
import { Code2, FileText, Save } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';

const LazyCodeEditorTabs = lazy(() => import('@/components/coding-playground/code-editor-tabs'));

export interface TrackOption {
    id: number;
    title: string;
    slug: string;
    is_active: boolean;
}

export interface ModuleOption {
    id: number;
    coding_track_id: number;
    title: string;
    is_active: boolean;
}

export type CodingLessonFormData = {
    id?: number;
    coding_track_id: string;
    coding_module_id: string;
    title: string;
    slug: string;
    content: string;
    starter_html: string;
    starter_css: string;
    starter_js: string;
    instructions: string;
    is_active: boolean;
    sort_order: number;
};

interface LessonFormProps {
    tracks: TrackOption[];
    modules: ModuleOption[];
    initialData: CodingLessonFormData;
    submitUrl: string;
    method: 'post' | 'put';
    submitLabel: string;
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

export default function LessonForm({ tracks, modules, initialData, submitUrl, method, submitLabel }: LessonFormProps) {
    const { appearance } = useAppearance();
    const [slugEdited, setSlugEdited] = useState(Boolean(initialData.id));
    const [activeCodeTab, setActiveCodeTab] = useState<EditorLanguage>('html');

    const { data, setData, post, put, processing, errors } = useForm<CodingLessonFormData>(initialData);

    const filteredModules = useMemo(
        () => modules.filter((mod) => String(mod.coding_track_id) === data.coding_track_id),
        [modules, data.coding_track_id],
    );

    const isDarkEditor =
        appearance === 'dark' ||
        (appearance === 'system' && typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

    const handleTrackChange = (nextTrackId: string) => {
        const currentModValid = modules.some(
            (mod) => String(mod.id) === data.coding_module_id && String(mod.coding_track_id) === nextTrackId,
        );
        setData((prev) => ({
            ...prev,
            coding_track_id: nextTrackId,
            coding_module_id: currentModValid ? prev.coding_module_id : '',
        }));
    };

    const handleTitleChange = (value: string) => {
        setData((prev) => ({
            ...prev,
            title: value,
            slug: slugEdited ? prev.slug : slugify(value),
        }));
    };

    const handleStarterCodeChange = (lang: EditorLanguage, nextValue: string) => {
        if (lang === 'html') setData('starter_html', nextValue);
        if (lang === 'css') setData('starter_css', nextValue);
        if (lang === 'js') setData('starter_js', nextValue);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (method === 'put') {
            put(submitUrl);
        } else {
            post(submitUrl);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Materi</CardTitle>
                    <CardDescription>Pilih program, bab, judul, slug, dan pengaturan publikasi materi.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="coding_track_id">Program</Label>
                            <Select value={data.coding_track_id} onValueChange={handleTrackChange}>
                                <SelectTrigger id="coding_track_id">
                                    <SelectValue placeholder="Pilih Program" />
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
                            <Label htmlFor="coding_module_id">Bab (Opsional)</Label>
                            <Select
                                value={data.coding_module_id || 'none'}
                                onValueChange={(value) => setData('coding_module_id', value === 'none' ? '' : value)}
                            >
                                <SelectTrigger id="coding_module_id">
                                    <SelectValue placeholder="Pilih Bab" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Tanpa Bab</SelectItem>
                                    {filteredModules.map((mod) => (
                                        <SelectItem key={mod.id} value={String(mod.id)}>
                                            {mod.title} {!mod.is_active ? '(Draft)' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.coding_module_id} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sort_order">Urutan Materi</Label>
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="title">Judul Materi</Label>
                            <Input
                                id="title"
                                value={data.title}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                placeholder="Contoh: Tag Heading dan Paragraf"
                                required
                            />
                            <InputError message={errors.title} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug URL</Label>
                            <Input
                                id="slug"
                                value={data.slug}
                                onChange={(e) => {
                                    setSlugEdited(true);
                                    setData('slug', slugify(e.target.value));
                                }}
                                placeholder="tag-heading-dan-paragraf"
                                required
                            />
                            <InputError message={errors.slug} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="instructions">Instruksi Latihan (Opsional)</Label>
                        <Textarea
                            id="instructions"
                            rows={3}
                            value={data.instructions}
                            onChange={(e) => setData('instructions', e.target.value)}
                            placeholder="Contoh: Ubah teks di dalam tag <h1> menjadi namamu lalu klik Jalankan."
                        />
                        <InputError message={errors.instructions} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="is_active" className="text-sm font-medium">
                                Publikasikan Materi
                            </Label>
                            <p className="text-muted-foreground text-xs">
                                Materi draft tidak akan terlihat dan tidak dapat diakses oleh pengunjung publik.
                            </p>
                        </div>
                        <Switch
                            id="is_active"
                            checked={data.is_active}
                            onCheckedChange={(checked) => setData('is_active', checked)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        <span>Konten Materi</span>
                    </CardTitle>
                    <CardDescription>
                        Tulis penjelasan materi lengkap (mendukung heading, paragraf, list, gambar, link, dan blok kode). Konten disanitasi otomatis demi keamanan.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Editor
                        apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                        value={data.content}
                        onEditorChange={(content) => setData('content', content)}
                        init={{
                            plugins: [
                                'anchor',
                                'autolink',
                                'charmap',
                                'codesample',
                                'image',
                                'link',
                                'lists',
                                'searchreplace',
                                'table',
                                'wordcount',
                                'code',
                            ],
                            toolbar:
                                'undo redo | blocks | bold italic underline | link image codesample | bullist numlist | removeformat | code',
                            height: 420,
                            menubar: false,
                            content_style:
                                'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; }',
                        }}
                    />
                    <InputError message={errors.content} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Code2 className="h-5 w-5" />
                        <span>Starter Code Latihan</span>
                    </CardTitle>
                    <CardDescription>
                        Kode awal yang akan dimuat di editor pengguna saat membuka materi ini. Disimpan apa adanya sebagai source code.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="h-[360px] overflow-hidden rounded-lg border">
                        <Suspense
                            fallback={
                                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                                    Memuat CodeMirror Editor...
                                </div>
                            }
                        >
                            <LazyCodeEditorTabs
                                values={{
                                    html: data.starter_html,
                                    css: data.starter_css,
                                    js: data.starter_js,
                                }}
                                onChange={handleStarterCodeChange}
                                activeTab={activeCodeTab}
                                onTabChange={setActiveCodeTab}
                                dark={isDarkEditor}
                                height="100%"
                            />
                        </Suspense>
                    </div>
                    <InputError message={errors.starter_html || errors.starter_css || errors.starter_js} />
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" asChild>
                    <Link href={route('admin.coding-playground.lessons.index')}>Batal</Link>
                </Button>
                <Button type="submit" disabled={processing}>
                    <Save className="h-4 w-4" />
                    <span>{processing ? 'Menyimpan...' : submitLabel}</span>
                </Button>
            </div>
        </form>
    );
}
