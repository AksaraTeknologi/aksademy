import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import UserLayout from '@/layouts/user-layout';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, Code2, Layers, Sparkles, Terminal } from 'lucide-react';

interface CodingTrackItem {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    level: 'beginner' | 'intermediate' | 'advanced' | string;
    sort_order: number;
    active_lessons_count: number;
}

interface CodingPlaygroundIndexProps {
    tracks: CodingTrackItem[];
}

const LEVEL_LABELS: Record<string, { label: string; className: string }> = {
    beginner: {
        label: 'Pemula',
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    intermediate: {
        label: 'Menengah',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    advanced: {
        label: 'Mahir',
        className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    },
};

export default function CodingPlaygroundIndex({ tracks }: CodingPlaygroundIndexProps) {
    return (
        <UserLayout>
            <Head title="Coding Playground" />

            {/* Hero Section */}
            <section className="from-background via-tertiary/70 to-background dark:via-background relative overflow-hidden border-b bg-gradient-to-b py-14 sm:py-20">
                <div className="pointer-events-none absolute top-1/2 left-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-12 opacity-40">
                    <div className="bg-primary/40 h-[260px] w-[260px] rounded-full blur-[160px]" />
                    <div className="bg-secondary/40 h-[260px] w-[260px] rounded-full blur-[160px]" />
                </div>

                <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
                    <div className="mx-auto max-w-3xl text-center">
                        <span className="border-secondary/40 bg-background text-secondary mb-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold shadow-xs sm:text-sm">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Gratis &amp; Tanpa Login</span>
                        </span>

                        <h1 className="text-foreground mb-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
                            Coding Playground
                        </h1>

                        <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-base leading-relaxed sm:text-lg">
                            Pelajari dasar pengembangan web mulai dari HTML, CSS, hingga JavaScript secara interaktif.
                            Baca materi, tulis kode langsung di browser, dan lihat hasilnya secara instan.
                        </p>

                        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-6 text-xs font-medium sm:text-sm">
                            <div className="flex items-center gap-2">
                                <Code2 className="text-primary h-4 w-4" />
                                <span>Editor HTML, CSS &amp; JS</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Terminal className="text-secondary h-4 w-4" />
                                <span>Output Sandbox Instan</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <BookOpen className="text-primary h-4 w-4" />
                                <span>Materi Terstruktur</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tracks Grid */}
            <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
                {tracks.length === 0 ? (
                    <div className="border-border bg-card mx-auto flex max-w-xl flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center shadow-xs">
                        <div className="bg-primary/10 text-primary mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                            <Code2 className="h-7 w-7" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold">Program Coding Playground Belum Tersedia</h2>
                        <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                            Materi interaktif HTML, CSS, dan JavaScript sedang disiapkan. Silakan kunjungi kembali dalam waktu dekat atau jelajahi program belajar lainnya di Aksademy.
                        </p>
                        <Button variant="outline" asChild>
                            <Link href="/course">Lihat Kelas Online</Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="mb-8 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Pilih Program Belajar</h2>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    Pilih jalur pembelajaran sesuai kebutuhanmu dan mulai praktik langsung.
                                </p>
                            </div>
                            <span className="text-muted-foreground text-sm font-medium">
                                {tracks.length} Program Tersedia
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {tracks.map((track) => {
                                const levelMeta = LEVEL_LABELS[track.level] ?? {
                                    label: track.level,
                                    className: 'bg-muted text-muted-foreground',
                                };

                                return (
                                    <Card
                                        key={track.id}
                                        className="group border-border/80 flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                                    >
                                        <div className="bg-muted relative aspect-video w-full overflow-hidden">
                                            {track.thumbnail ? (
                                                <img
                                                    src={`/storage/${track.thumbnail}`}
                                                    alt={track.title}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="from-primary/90 to-primary/60 flex h-full w-full items-center justify-center bg-gradient-to-br text-white">
                                                    <Code2 className="h-14 w-14 opacity-85" />
                                                </div>
                                            )}
                                            <div className="absolute top-3 left-3">
                                                <Badge variant="outline" className={levelMeta.className}>
                                                    {levelMeta.label}
                                                </Badge>
                                            </div>
                                        </div>

                                        <CardHeader className="pb-2">
                                            <CardTitle className="line-clamp-1 text-xl">{track.title}</CardTitle>
                                            <CardDescription className="line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed">
                                                {track.description || 'Belajar dan praktik langsung menggunakan editor kode interaktif.'}
                                            </CardDescription>
                                        </CardHeader>

                                        <CardContent className="mt-auto pt-0">
                                            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                                                <Layers className="text-primary h-4 w-4" />
                                                <span>{track.active_lessons_count} Materi Aktif</span>
                                            </div>
                                        </CardContent>

                                        <CardFooter className="border-t pt-4">
                                            <Button asChild className="w-full gap-2">
                                                <Link href={route('coding-playground.track', track.slug)}>
                                                    <span>Mulai Belajar</span>
                                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                                </Link>
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    </>
                )}
            </section>
        </UserLayout>
    );
}
