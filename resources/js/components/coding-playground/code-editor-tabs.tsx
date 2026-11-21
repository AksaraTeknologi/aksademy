import { cn } from '@/lib/utils';
import { Code2, FileCode, Paintbrush } from 'lucide-react';
import { useState } from 'react';
import CodeEditorPane, { type EditorLanguage } from './code-editor-pane';

export interface CodeTabValues {
    html: string;
    css: string;
    js: string;
}

interface CodeEditorTabsProps {
    values: CodeTabValues;
    onChange: (lang: EditorLanguage, value: string) => void;
    activeTab?: EditorLanguage;
    onTabChange?: (lang: EditorLanguage) => void;
    dark?: boolean;
    height?: string;
    className?: string;
    rightSlot?: React.ReactNode;
}

const TAB_CONFIG: Array<{
    key: EditorLanguage;
    label: string;
    filename: string;
    icon: typeof Code2;
}> = [
    { key: 'html', label: 'HTML', filename: 'index.html', icon: FileCode },
    { key: 'css', label: 'CSS', filename: 'style.css', icon: Paintbrush },
    { key: 'js', label: 'JavaScript', filename: 'script.js', icon: Code2 },
];

export default function CodeEditorTabs({
    values,
    onChange,
    activeTab: controlledTab,
    onTabChange,
    dark = true,
    height = '100%',
    className = '',
    rightSlot,
}: CodeEditorTabsProps) {
    const [internalTab, setInternalTab] = useState<EditorLanguage>('html');
    const activeTab = controlledTab ?? internalTab;

    const handleSelectTab = (tab: EditorLanguage) => {
        if (onTabChange) {
            onTabChange(tab);
        } else {
            setInternalTab(tab);
        }
    };

    return (
        <div className={cn('flex h-full flex-col overflow-hidden', className)}>
            <div
                className={cn(
                    'flex shrink-0 items-center justify-between gap-2 border-b px-2',
                    dark ? 'border-slate-800 bg-slate-900 text-slate-200' : 'border-border bg-muted/40 text-foreground',
                )}
            >
                <div className="flex items-center gap-1 overflow-x-auto py-1" role="tablist" aria-label="Editor tabs">
                    {TAB_CONFIG.map((tab) => {
                        const Icon = tab.icon;
                        const isSelected = activeTab === tab.key;
                        const hasCode = values[tab.key].trim().length > 0;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={isSelected}
                                title={`${tab.label} (${tab.filename})${tab.key !== 'html' ? ' — Opsional, otomatis terhubung atau panggil lewat ' + tab.filename : ''}`}
                                onClick={() => handleSelectTab(tab.key)}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                                    isSelected
                                        ? dark
                                            ? 'bg-slate-800 text-white shadow-xs ring-1 ring-slate-700'
                                            : 'bg-background text-primary shadow-xs ring-1 ring-border'
                                        : dark
                                          ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="font-mono text-[11.5px]">{tab.filename}</span>
                                {hasCode && (
                                    <span
                                        className={cn(
                                            'h-1.5 w-1.5 rounded-full',
                                            isSelected ? 'bg-primary' : 'bg-emerald-500/80',
                                        )}
                                        aria-hidden="true"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
                {rightSlot ? (
                    <div className="flex items-center gap-1.5 py-1 pl-2">{rightSlot}</div>
                ) : (
                    <span
                        className={cn(
                            'hidden truncate text-[11px] xl:inline',
                            dark ? 'text-slate-400' : 'text-muted-foreground',
                        )}
                        title="Tab CSS & JS opsional: otomatis aktif atau hubungkan manual dengan style.css & script.js"
                    >
                        CSS &amp; JS opsional (style.css / script.js)
                    </span>
                )}
            </div>

            <div className="relative min-h-0 flex-1">
                {TAB_CONFIG.map((tab) => (
                    <div
                        key={tab.key}
                        role="tabpanel"
                        aria-hidden={activeTab !== tab.key}
                        className={cn('h-full w-full', activeTab === tab.key ? 'block' : 'hidden')}
                    >
                        <CodeEditorPane
                            language={tab.key}
                            value={values[tab.key]}
                            onChange={(nextValue) => onChange(tab.key, nextValue)}
                            dark={dark}
                            height={height}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
