import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PREVIEW_SANDBOX_ATTRIBUTES } from '@/lib/coding-playground-preview';
import { cn } from '@/lib/utils';
import { Eye, Maximize2, Minimize2 } from 'lucide-react';
import { memo, useState } from 'react';

interface PreviewFrameProps {
    srcDoc: string;
    runCount: number;
    title?: string;
    className?: string;
    showHeader?: boolean;
    onFullscreenChange?: (open: boolean) => void;
}

function PreviewFrame({
    srcDoc,
    runCount,
    title = 'Output Preview',
    className = '',
    showHeader = true,
    onFullscreenChange,
}: PreviewFrameProps) {
    const [fullscreenOpen, setFullscreenOpen] = useState(false);

    const handleOpenChange = (open: boolean) => {
        setFullscreenOpen(open);
        onFullscreenChange?.(open);
    };

    return (
        <div className={cn('flex h-full flex-col overflow-hidden bg-white dark:bg-slate-950', className)}>
            {showHeader && (
                <div className="border-border bg-muted/40 flex shrink-0 items-center justify-between border-b px-3 py-1.5">
                    <div className="flex items-center gap-2">
                        <Eye className="text-primary h-4 w-4" />
                        <span className="text-xs font-semibold tracking-wide uppercase">{title}</span>
                        <span className="text-muted-foreground hidden text-[11px] sm:inline">(Sandbox Terisolasi)</span>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenChange(true)}
                        className="h-7 gap-1.5 px-2.5 text-xs"
                    >
                        <Maximize2 className="h-3.5 w-3.5" />
                        <span>Preview Full</span>
                    </Button>
                </div>
            )}

            <div className="relative min-h-0 flex-1 bg-white">
                <iframe
                    key={`preview-${runCount}`}
                    title={title}
                    srcDoc={srcDoc}
                    sandbox={PREVIEW_SANDBOX_ATTRIBUTES}
                    className="h-full w-full border-0 bg-white"
                    referrerPolicy="no-referrer"
                />
            </div>

            <Dialog open={fullscreenOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="flex h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]">
                    <DialogHeader className="border-border bg-muted/40 flex shrink-0 flex-row items-center justify-between border-b px-4 py-3">
                        <div>
                            <DialogTitle className="flex items-center gap-2 text-base">
                                <Eye className="text-primary h-4 w-4" />
                                <span>{title} — Fullscreen</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Menjalankan kode pada iframe sandbox terisolasi.
                            </DialogDescription>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenChange(false)}
                            className="mr-8 h-8 gap-1.5 text-xs"
                        >
                            <Minimize2 className="h-3.5 w-3.5" />
                            <span>Tutup Preview</span>
                        </Button>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 bg-white">
                        <iframe
                            key={`preview-full-${runCount}`}
                            title={`${title} Fullscreen`}
                            srcDoc={srcDoc}
                            sandbox={PREVIEW_SANDBOX_ATTRIBUTES}
                            className="h-full w-full border-0 bg-white"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default memo(PreviewFrame);
