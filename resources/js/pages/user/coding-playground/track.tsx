import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import UserLayout from '@/layouts/user-layout';
import { calculateProgressStats, getGuestCompletedLessonIds } from '@/lib/coding-playground-progress';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Circle, Code2, FolderKanban, Layers, PlayCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface CodingTrackDetail {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    thumbnail: string | null;
    level: 'beginner' | 'intermediate' | 'advanced' | string;
}

interface CodingLessonSummary {
    id: number;
    coding_track_id: number;
    coding_module_id: number | null;
    title: string;
    slug: string;
    instructions?: string | null;
    sort_order: number;
}

interface CodingModuleGroup {
    id: number | null;
    title: string;
    description: string | null;
    sort_order: number;
    lessons: CodingLessonSummary[];
}

interface TrackDetailProps {
    track: CodingTrackDetail;
    modules: CodingModuleGroup[];
    lessons: CodingLessonSummary[];
    completedLessonIds: number[];
}

const LEVEL_LABELS: Record<string, string> = {
    beginner: 'Pemula',
    intermediate: 'Menengah',
    advanced: 'Mahir',
};

export default function CodingPlaygroundTrack({ track, modules, lessons, completedLessonIds }: TrackDetailProps) {
    const { auth } = usePage<SharedData>().props;
    const isAuthenticated = Boolean(auth?.user);

    const [guestCompletedIds, setGuestCompletedIds] = useState<number[]>([]);

    useEffect(() => {
        if (isAuthenticated) return;

        const syncGuestProgress = () => {
            setGuestCompletedIds(getGuestCompletedLessonIds());
        };

        syncGuestProgress();
        window.addEventListener('storage', syncGuestProgress);
        window.addEventListener('pageshow', syncGuestProgress);
        return () => {
            window.removeEventListener('storage', syncGuestProgress);
            window.removeEventListener('pageshow', syncGuestProgress);
        };
    }, [isAuthenticated]);

    const activeCompletedIds = isAuthenticated ? completedLessonIds : guestCompletedIds;
    const activeLessonIds = useMemo(() => lessons.map((lesson) => lesson.id), [lessons]);

    const progress = useMemo(
        () => calculateProgressStats(activeLessonIds, activeCompletedIds),
        [activeLessonIds, activeCompletedIds],
    );

    const completedSet = useMemo(() => new Set(activeCompletedIds), [activeCompletedIds]);

    const firstLesson = lessons[0] ?? null;
    const nextIncompleteLesson = lessons.find((lesson) => !completedSet.has(lesson.id)) ?? firstLesson;
    const hasProgress = progress.completed > 0;
    const hasChapters = modules.some((mod) => mod.id !== null);

    let globalLessonCounter = 0;

    return (
        <UserLayout>
            <Head title={`${track.title} - Coding Playground`} />

            <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
                <div className="mb-6">
                    <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2 gap-1.5">
                        <Link href={route('coding-playground.index')}>
                            <ArrowLeft className="h-4 w-4" />
                            <span>Kembali ke Coding Playground</span>
                        </Link>
                    </Button>
                </div>

                {/* Program Overview Card */}
                <Card className="mb-8 overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3">
                        <div className="bg-muted relative aspect-video md:aspect-auto">
                            {track.thumbnail ? (
                                <img
                                    src={`/storage/${track.thumbnail}`}
                                    alt={track.title}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="from-primary to-primary/70 flex h-full min-h-[180px] w-full items-center justify-center bg-gradient-to-br text-white">
                                    <Code2 className="h-16 w-16 opacity-85" />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col justify-between p-6 md:col-span-2">
                            <div>
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary">
                                        Level: {LEVEL_LABELS[track.level] ?? track.level}
                                    </Badge>
                                    {hasChapters && (
                                        <Badge variant="outline" className="gap-1">
                                            <FolderKanban className="h-3.5 w-3.5" />
                                            <span>{modules.filter((m) => m.id !== null).length} Bab</span>
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className="gap-1">
                                        <Layers className="h-3.5 w-3.5" />
                                        <span>{lessons.length} Materi</span>
                                    </Badge>
                                </div>

                                <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{track.title}</h1>
                                <p className="text-muted-foreground mb-6 text-sm leading-relaxed sm:text-base">
                                    {track.description || 'Ikuti setiap materi secara berurutan dan jalankan kode langsung di browser.'}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-muted/50 rounded-xl border p-4">
                                    <div className="mb-2 flex items-center justify-between text-sm">
                                        <span className="font-medium">Progres Belajar</span>
                                        <span className="text-primary font-semibold">
                                            {progress.completed} / {progress.total} materi ({progress.percentage}%)
                                        </span>
                                    </div>
                                    <Progress value={progress.percentage} className="h-2.5" />
                                    {!isAuthenticated && (
                                        <p className="text-muted-foreground mt-2 text-xs">
                                            Progres disimpan di browser ini (Guest Mode). Login untuk menyimpan progres di akun Anda.
                                        </p>
                                    )}
                                </div>

                                {nextIncompleteLesson && (
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Button asChild size="lg" className="gap-2">
                                            <Link href={route('coding-playground.lesson', [track.slug, nextIncompleteLesson.slug])}>
                                                <PlayCircle className="h-4 w-4" />
                                                <span>{hasProgress ? 'Lanjutkan Belajar' : 'Mulai Belajar'}</span>
                                            </Link>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Chapters & Lessons List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <BookOpen className="text-primary h-5 w-5" />
                            <span>{hasChapters ? 'Kurikulum Bab & Materi' : 'Daftar Materi'}</span>
                        </CardTitle>
                        <CardDescription>
                            Materi disusun berurutan per bab dari dasar hingga latihan interaktif.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {lessons.length === 0 ? (
                            <div className="text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
                                Belum ada materi yang dipublikasikan untuk program ini.
                            </div>
                        ) : (
                            modules.map((modGroup, modIdx) => {
                                if (modGroup.lessons.length === 0 && modGroup.id === null) {
                                    return null;
                                }

                                const modCompletedCount = modGroup.lessons.filter((l) => completedSet.has(l.id)).length;

                                return (
                                    <div key={modGroup.id ?? `ungrouped-${modIdx}`} className="overflow-hidden rounded-xl border">
                                        {(hasChapters || modGroup.id !== null) && (
                                            <div className="bg-muted/40 border-b px-4 py-3 sm:px-5">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <FolderKanban className="text-primary h-4 w-4 shrink-0" />
                                                        <h2 className="text-foreground text-base font-semibold">{modGroup.title}</h2>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs">
                                                        {modCompletedCount} / {modGroup.lessons.length} selesai
                                                    </Badge>
                                                </div>
                                                {modGroup.description && (
                                                    <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                                                        {modGroup.description}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {modGroup.lessons.length === 0 ? (
                                            <div className="text-muted-foreground px-4 py-6 text-center text-xs">
                                                Belum ada materi pada bab ini.
                                            </div>
                                        ) : (
                                            <div className="divide-border divide-y">
                                                {modGroup.lessons.map((lesson) => {
                                                    globalLessonCounter += 1;
                                                    const isCompleted = completedSet.has(lesson.id);
                                                    return (
                                                        <Link
                                                            key={lesson.id}
                                                            href={route('coding-playground.lesson', [track.slug, lesson.slug])}
                                                            className="hover:bg-muted/50 flex flex-col justify-between gap-3 p-4 transition-colors sm:flex-row sm:items-center"
                                                        >
                                                            <div className="flex items-start gap-3 sm:items-center">
                                                                <div
                                                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                                        isCompleted
                                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                                            : 'bg-primary/10 text-primary'
                                                                    }`}
                                                                >
                                                                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : globalLessonCounter}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h3 className="text-foreground font-medium">{lesson.title}</h3>
                                                                    {lesson.instructions && (
                                                                        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                                                                            Latihan: {lesson.instructions}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between gap-3 pl-11 sm:justify-end sm:pl-0">
                                                                {isCompleted ? (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                                                    >
                                                                        Selesai
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-muted-foreground gap-1">
                                                                        <Circle className="h-3 w-3" />
                                                                        <span>Belum Selesai</span>
                                                                    </Badge>
                                                                )}
                                                                <span className="text-primary inline-flex items-center gap-1 text-xs font-semibold">
                                                                    <span>Buka</span>
                                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                                </span>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>
        </UserLayout>
    );
}
