import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { type EditorLanguage } from '@/components/coding-playground/code-editor-pane';
import { type CodeTabValues } from '@/components/coding-playground/code-editor-tabs';
import PreviewFrame from '@/components/coding-playground/preview-frame';
import { useAppearance } from '@/hooks/use-appearance';
import { useIsMobile } from '@/hooks/use-mobile';
import { buildPreviewDocument } from '@/lib/coding-playground-preview';
import {
    calculateProgressStats,
    getGuestCompletedLessonIds,
    markGuestLessonCompleted,
    unmarkGuestLessonCompleted,
} from '@/lib/coding-playground-progress';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Circle,
    Code2,
    Eye,
    List,
    Play,
    RotateCcw,
    Sparkles,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const LazyCodeEditorTabs = lazy(() => import('@/components/coding-playground/code-editor-tabs'));

interface TrackSummary {
    id: number;
    title: string;
    slug: string;
    level: string;
}

interface LessonDetail {
    id: number;
    coding_track_id: number;
    coding_module_id: number | null;
    module_title: string | null;
    title: string;
    slug: string;
    content: string;
    starter_html: string;
    starter_css: string;
    starter_js: string;
    instructions: string | null;
    sort_order: number;
}

interface LessonNavItem {
    id: number;
    coding_track_id: number;
    coding_module_id?: number | null;
    title: string;
    slug: string;
    sort_order: number;
}

interface ModuleGroupNav {
    id: number | null;
    title: string;
    description: string | null;
    sort_order: number;
    lessons: LessonNavItem[];
}

interface LessonSummaryLink {
    id: number;
    title: string;
    slug: string;
}

interface LessonWorkspaceProps {
    track: TrackSummary;
    lesson: LessonDetail;
    modules?: ModuleGroupNav[];
    lessons: LessonNavItem[];
    previousLesson: LessonSummaryLink | null;
    nextLesson: LessonSummaryLink | null;
    completedLessonIds: number[];
}

type MobileSection = 'materi' | 'editor' | 'output';

export default function CodingPlaygroundLesson({
    track,
    lesson,
    modules = [],
    lessons,
    previousLesson,
    nextLesson,
    completedLessonIds,
}: LessonWorkspaceProps) {
    const { auth } = usePage<SharedData>().props;
    const isAuthenticated = Boolean(auth?.user);
    const { appearance } = useAppearance();
    const isMobile = useIsMobile();

    const starterCode = useMemo<CodeTabValues>(
        () => ({
            html: lesson.starter_html ?? '',
            css: lesson.starter_css ?? '',
            js: lesson.starter_js ?? '',
        }),
        [lesson.starter_html, lesson.starter_css, lesson.starter_js],
    );

    const [code, setCode] = useState<CodeTabValues>(starterCode);
    const [lastRunCode, setLastRunCode] = useState<CodeTabValues>(starterCode);
    const [activeEditorTab, setActiveEditorTab] = useState<EditorLanguage>('html');
    const [previewDoc, setPreviewDoc] = useState<string>(() => buildPreviewDocument(starterCode));
    const [runCount, setRunCount] = useState<number>(1);
    const [mobileSection, setMobileSection] = useState<MobileSection>('materi');
    const [lessonDrawerOpen, setLessonDrawerOpen] = useState(false);

    // Split panel ratios
    const [leftWidthPercent, setLeftWidthPercent] = useState<number>(45);
    const [editorHeightPercent, setEditorHeightPercent] = useState<number>(52);
    const workspaceRef = useRef<HTMLDivElement | null>(null);
    const rightPaneRef = useRef<HTMLDivElement | null>(null);
    const draggingAxisRef = useRef<'horizontal' | 'vertical' | null>(null);

    // Progress state (auth from server props, guest from localStorage)
    const [guestCompletedIds, setGuestCompletedIds] = useState<number[]>([]);
    const [progressSubmitting, setProgressSubmitting] = useState(false);

    // Unsaved changes confirmation dialog
    const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            setGuestCompletedIds(getGuestCompletedLessonIds());
        }
    }, [isAuthenticated, lesson.id]);

    // Reset code & preview whenever lesson changes
    useEffect(() => {
        const nextStarter: CodeTabValues = {
            html: lesson.starter_html ?? '',
            css: lesson.starter_css ?? '',
            js: lesson.starter_js ?? '',
        };
        setCode(nextStarter);
        setLastRunCode(nextStarter);
        setPreviewDoc(buildPreviewDocument(nextStarter));
        setRunCount((prev) => prev + 1);
        setMobileSection('materi');
    }, [lesson.id, lesson.starter_html, lesson.starter_css, lesson.starter_js]);

    const activeCompletedIds = isAuthenticated ? completedLessonIds : guestCompletedIds;
    const activeLessonIds = useMemo(() => lessons.map((item) => item.id), [lessons]);
    const progress = useMemo(
        () => calculateProgressStats(activeLessonIds, activeCompletedIds),
        [activeLessonIds, activeCompletedIds],
    );
    const completedSet = useMemo(() => new Set(activeCompletedIds), [activeCompletedIds]);
    const isCurrentCompleted = completedSet.has(lesson.id);

    const hasUnrunChanges =
        code.html !== lastRunCode.html || code.css !== lastRunCode.css || code.js !== lastRunCode.js;

    const handleCodeChange = useCallback((lang: EditorLanguage, nextValue: string) => {
        setCode((prev) => ({
            ...prev,
            [lang]: nextValue,
        }));
    }, []);

    const handleRunCode = useCallback(() => {
        setPreviewDoc(buildPreviewDocument(code));
        setLastRunCode(code);
        setRunCount((prev) => prev + 1);
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setMobileSection('output');
        }
    }, [code]);

    const handleResetStarterCode = useCallback(() => {
        setCode(starterCode);
        setLastRunCode(starterCode);
        setPreviewDoc(buildPreviewDocument(starterCode));
        setRunCount((prev) => prev + 1);
        toast.success('Kode dikembalikan ke starter code.');
    }, [starterCode]);

    const handleToggleComplete = useCallback(() => {
        if (!isAuthenticated) {
            if (isCurrentCompleted) {
                const updated = unmarkGuestLessonCompleted(lesson.id);
                setGuestCompletedIds(updated);
                toast.success('Status selesai dibatalkan.');
            } else {
                const updated = markGuestLessonCompleted(lesson.id);
                setGuestCompletedIds(updated);
                toast.success('Materi ditandai selesai!');
            }
            return;
        }

        if (progressSubmitting) return;
        setProgressSubmitting(true);

        const targetRoute = isCurrentCompleted
            ? route('coding-playground.lesson.uncomplete', [track.slug, lesson.slug])
            : route('coding-playground.lesson.complete', [track.slug, lesson.slug]);

        const method = isCurrentCompleted ? 'delete' : 'post';

        router[method](
            targetRoute,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success(isCurrentCompleted ? 'Status selesai dibatalkan.' : 'Materi ditandai selesai!');
                },
                onError: () => {
                    toast.error('Gagal memperbarui progres materi.');
                },
                onFinish: () => {
                    setProgressSubmitting(false);
                },
            },
        );
    }, [isAuthenticated, isCurrentCompleted, lesson.id, lesson.slug, progressSubmitting, track.slug]);

    const navigateWithGuard = useCallback(
        (targetUrl: string) => {
            if (hasUnrunChanges) {
                setPendingNavUrl(targetUrl);
                return;
            }
            setLessonDrawerOpen(false);
            router.visit(targetUrl);
        },
        [hasUnrunChanges],
    );

    const confirmDiscardAndNavigate = useCallback(() => {
        if (!pendingNavUrl) return;
        const url = pendingNavUrl;
        setPendingNavUrl(null);
        setLessonDrawerOpen(false);
        router.visit(url);
    }, [pendingNavUrl]);

    // Drag handlers for desktop/tablet resizable splitters
    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (draggingAxisRef.current === 'horizontal' && workspaceRef.current) {
                const rect = workspaceRef.current.getBoundingClientRect();
                if (rect.width > 0) {
                    const nextPercent = ((e.clientX - rect.left) / rect.width) * 100;
                    setLeftWidthPercent(Math.min(68, Math.max(28, nextPercent)));
                }
            } else if (draggingAxisRef.current === 'vertical' && rightPaneRef.current) {
                const rect = rightPaneRef.current.getBoundingClientRect();
                if (rect.height > 0) {
                    const nextPercent = ((e.clientY - rect.top) / rect.height) * 100;
                    setEditorHeightPercent(Math.min(75, Math.max(25, nextPercent)));
                }
            }
        };

        const handlePointerUp = () => {
            draggingAxisRef.current = null;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, []);

    const startDragging = (axis: 'horizontal' | 'vertical') => {
        draggingAxisRef.current = axis;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = axis === 'horizontal' ? 'col-resize' : 'row-resize';
    };

    const isDarkEditor =
        appearance === 'dark' ||
        (appearance === 'system' && typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

    const lessonListPanel = (() => {
        const groups: ModuleGroupNav[] =
            modules.length > 0
                ? modules
                : [{ id: null, title: 'Daftar Materi', description: null, sort_order: 0, lessons }];
        const showGroupHeaders = modules.some((m) => m.id !== null);
        let counter = 0;

        return (
            <div className="space-y-4 py-2">
                {groups.map((group, gIdx) => {
                    if (group.lessons.length === 0) return null;
                    return (
                        <div key={group.id ?? `group-${gIdx}`} className="space-y-1.5">
                            {showGroupHeaders && (
                                <div className="text-muted-foreground px-1 text-xs font-semibold tracking-wide uppercase">
                                    {group.title}
                                </div>
                            )}
                            {group.lessons.map((item) => {
                                counter += 1;
                                const completed = completedSet.has(item.id);
                                const isCurrent = item.id === lesson.id;
                                const itemUrl = route('coding-playground.lesson', [track.slug, item.slug]);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => navigateWithGuard(itemUrl)}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                                            isCurrent
                                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                                : 'border-transparent hover:bg-muted',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                                completed
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                    : isCurrent
                                                      ? 'bg-primary text-primary-foreground'
                                                      : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : counter}
                                        </span>
                                        <span className="line-clamp-2 flex-1">{item.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        );
    })();

    const materialPanelContent = (
        <div className="flex h-full flex-col overflow-y-auto px-4 py-5 sm:px-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="font-medium">
                        {track.title}
                    </Badge>
                    {lesson.module_title && (
                        <Badge variant="outline" className="font-medium">
                            {lesson.module_title}
                        </Badge>
                    )}
                </div>
                <span className="text-muted-foreground text-xs font-medium">
                    Progres: {progress.completed}/{progress.total} ({progress.percentage}%)
                </span>
            </div>

            <h1 className="text-foreground mb-4 text-2xl font-bold tracking-tight sm:text-3xl">{lesson.title}</h1>

            <div
                className="prose prose-slate dark:prose-invert prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-img:rounded-lg max-w-none flex-1 text-sm leading-relaxed sm:text-base"
                dangerouslySetInnerHTML={{ __html: lesson.content }}
            />

            {lesson.instructions && (
                <div className="border-primary/30 bg-primary/5 mt-6 rounded-xl border p-4">
                    <div className="text-primary mb-1.5 flex items-center gap-2 text-sm font-semibold">
                        <Sparkles className="h-4 w-4" />
                        <span>Instruksi Latihan</span>
                    </div>
                    <p className="text-foreground/90 text-sm whitespace-pre-line leading-relaxed">{lesson.instructions}</p>
                </div>
            )}

            {/* Previous / Next Navigation */}
            <div className="border-border mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                {previousLesson ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigateWithGuard(route('coding-playground.lesson', [track.slug, previousLesson.slug]))}
                        className="max-w-full gap-1.5"
                    >
                        <ChevronLeft className="h-4 w-4 shrink-0" />
                        <span className="truncate">Sebelumnya: {previousLesson.title}</span>
                    </Button>
                ) : (
                    <div />
                )}

                {nextLesson && (
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => navigateWithGuard(route('coding-playground.lesson', [track.slug, nextLesson.slug]))}
                        className="ml-auto max-w-full gap-1.5"
                    >
                        <span className="truncate">Selanjutnya: {nextLesson.title}</span>
                        <ChevronRight className="h-4 w-4 shrink-0" />
                    </Button>
                )}
            </div>
        </div>
    );

    const editorToolbarButtons = (
        <div className="flex items-center gap-1.5">
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetStarterCode}
                className="h-7 gap-1 px-2.5 text-xs"
                title="Kembalikan ke starter code"
            >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Bersihkan</span>
            </Button>
            <Button
                type="button"
                size="sm"
                onClick={handleRunCode}
                className="h-7 gap-1 px-3 text-xs font-semibold"
            >
                <Play className="h-3.5 w-3.5" />
                <span>Jalankan</span>
            </Button>
        </div>
    );

    const editorSection = (
        <div className="flex h-full flex-col overflow-hidden">
            <div className="border-border bg-muted/40 flex shrink-0 items-center justify-between border-b px-3 py-1.5">
                <div className="flex items-center gap-2">
                    <Code2 className="text-primary h-4 w-4" />
                    <span className="text-xs font-semibold tracking-wide uppercase">Code Editor</span>
                    {hasUnrunChanges && (
                        <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded px-1.5 py-0.5 text-[10px] font-medium">
                            Belum dijalankan
                        </span>
                    )}
                </div>
                {editorToolbarButtons}
            </div>

            <div className="min-h-0 flex-1">
                <Suspense
                    fallback={
                        <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                            Memuat Code Editor...
                        </div>
                    }
                >
                    <LazyCodeEditorTabs
                        key={lesson.id}
                        values={code}
                        onChange={handleCodeChange}
                        activeTab={activeEditorTab}
                        onTabChange={setActiveEditorTab}
                        dark={isDarkEditor}
                        height="100%"
                    />
                </Suspense>
            </div>
        </div>
    );

    return (
        <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
            <Head title={`${lesson.title} - ${track.title}`} />
            <Toaster position="top-center" richColors />

            {/* Top Workspace Header */}
            <header className="border-border bg-background z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateWithGuard(route('coding-playground.track', track.slug))}
                        className="h-8 gap-1 px-2 text-xs sm:px-2.5"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Kembali</span>
                    </Button>

                    <div className="bg-border hidden h-5 w-px sm:block" />

                    <div className="min-w-0">
                        <Link
                            href={route('coding-playground.index')}
                            className="text-muted-foreground hover:text-foreground hidden text-[11px] font-medium sm:block"
                        >
                            Coding Playground / {track.title}
                        </Link>
                        <p className="truncate text-sm font-semibold">{lesson.title}</p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <Sheet open={lessonDrawerOpen} onOpenChange={setLessonDrawerOpen}>
                        <SheetTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs">
                                <List className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Daftar Materi</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex w-80 flex-col sm:w-96">
                            <SheetHeader className="border-b pb-3">
                                <SheetTitle>{track.title}</SheetTitle>
                                <SheetDescription>
                                    {progress.completed} dari {progress.total} materi selesai ({progress.percentage}%)
                                </SheetDescription>
                                <Progress value={progress.percentage} className="mt-2 h-2" />
                            </SheetHeader>
                            <div className="min-h-0 flex-1 overflow-y-auto px-4">{lessonListPanel}</div>
                        </SheetContent>
                    </Sheet>

                    <Button
                        type="button"
                        variant={isCurrentCompleted ? 'secondary' : 'outline'}
                        size="sm"
                        disabled={progressSubmitting}
                        onClick={handleToggleComplete}
                        className={cn(
                            'h-8 gap-1.5 px-2.5 text-xs',
                            isCurrentCompleted &&
                                'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700',
                        )}
                    >
                        {isCurrentCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                        <span>{isCurrentCompleted ? 'Selesai' : 'Tandai Selesai'}</span>
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        onClick={handleRunCode}
                        className="h-8 gap-1.5 px-3 text-xs font-semibold md:hidden"
                    >
                        <Play className="h-3.5 w-3.5" />
                        <span>Jalankan</span>
                    </Button>
                </div>
            </header>

            {/* Mobile Tab Switcher (< 768px) */}
            <div className="border-border bg-muted/30 grid shrink-0 grid-cols-3 border-b p-1 md:hidden">
                <button
                    type="button"
                    onClick={() => setMobileSection('materi')}
                    className={cn(
                        'flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors',
                        mobileSection === 'materi' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground',
                    )}
                >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Materi</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMobileSection('editor')}
                    className={cn(
                        'flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors',
                        mobileSection === 'editor' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground',
                    )}
                >
                    <Code2 className="h-3.5 w-3.5" />
                    <span>Editor</span>
                </button>
                <button
                    type="button"
                    onClick={() => setMobileSection('output')}
                    className={cn(
                        'flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors',
                        mobileSection === 'output' ? 'bg-background text-primary shadow-xs' : 'text-muted-foreground',
                    )}
                >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Output</span>
                </button>
            </div>

            {/* Body: Mobile Tabbed View vs Tablet/Desktop Split Screen */}
            {isMobile ? (
                <div className="min-h-0 flex-1">
                    <div className={cn('h-full', mobileSection === 'materi' ? 'block' : 'hidden')}>{materialPanelContent}</div>
                    <div className={cn('h-full', mobileSection === 'editor' ? 'block' : 'hidden')}>{editorSection}</div>
                    <div className={cn('h-full', mobileSection === 'output' ? 'block' : 'hidden')}>
                        <PreviewFrame srcDoc={previewDoc} runCount={runCount} />
                    </div>
                </div>
            ) : (
                <div ref={workspaceRef} className="flex min-h-0 flex-1">
                    {/* Left Panel: Materi */}
                    <section
                        style={{ width: `${leftWidthPercent}%` }}
                        className="border-border bg-background min-h-0 min-w-[260px] overflow-hidden border-r"
                        aria-label="Materi Pembelajaran"
                    >
                        {materialPanelContent}
                    </section>

                    {/* Draggable Vertical Divider */}
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Ubah ukuran panel materi dan editor"
                        onPointerDown={() => startDragging('horizontal')}
                        onDoubleClick={() => setLeftWidthPercent(45)}
                        className="bg-border hover:bg-primary/60 active:bg-primary flex w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-colors"
                        title="Geser untuk mengubah ukuran panel (klik ganda untuk reset)"
                    >
                        <div className="bg-muted-foreground/40 h-8 w-0.5 rounded-full" />
                    </div>

                    {/* Right Panel: Editor (top) + Preview (bottom) */}
                    <section
                        ref={rightPaneRef}
                        style={{ width: `calc(${100 - leftWidthPercent}% - 6px)` }}
                        className="flex min-h-0 min-w-[320px] flex-1 flex-col overflow-hidden"
                        aria-label="Editor dan Output"
                    >
                        {/* Top: Code Editor */}
                        <div style={{ height: `${editorHeightPercent}%` }} className="min-h-[160px] overflow-hidden">
                            {editorSection}
                        </div>

                        {/* Draggable Horizontal Divider */}
                        <div
                            role="separator"
                            aria-orientation="horizontal"
                            aria-label="Ubah ukuran editor dan output"
                            onPointerDown={() => startDragging('vertical')}
                            onDoubleClick={() => setEditorHeightPercent(52)}
                            className="bg-border hover:bg-primary/60 active:bg-primary flex h-1.5 shrink-0 cursor-row-resize items-center justify-center transition-colors"
                            title="Geser untuk mengubah ukuran editor dan output"
                        >
                            <div className="bg-muted-foreground/40 h-0.5 w-8 rounded-full" />
                        </div>

                        {/* Bottom: Output Preview */}
                        <div style={{ height: `calc(${100 - editorHeightPercent}% - 6px)` }} className="min-h-[140px] flex-1 overflow-hidden">
                            <PreviewFrame srcDoc={previewDoc} runCount={runCount} />
                        </div>
                    </section>
                </div>
            )}

            {/* Unsaved Changes Confirmation Dialog */}
            <AlertDialog open={Boolean(pendingNavUrl)} onOpenChange={(open) => !open && setPendingNavUrl(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Perubahan Kode Belum Dijalankan</AlertDialogTitle>
                        <AlertDialogDescription>
                            Anda telah mengubah kode di editor dan belum menjalankannya. Jika berpindah materi sekarang, perubahan tersebut akan hilang.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Tetap di Materi Ini</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDiscardAndNavigate}>Pindah &amp; Buang Perubahan</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
