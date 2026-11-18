import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { bracketMatching, defaultHighlightStyle, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { drawSelection, dropCursor, EditorView, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, keymap, lineNumbers } from '@codemirror/view';
import { useEffect, useRef } from 'react';

export type EditorLanguage = 'html' | 'css' | 'js';

interface CodeEditorPaneProps {
    language: EditorLanguage;
    value: string;
    onChange: (value: string) => void;
    dark?: boolean;
    className?: string;
    height?: string;
}

function getLanguageExtension(language: EditorLanguage): Extension {
    switch (language) {
        case 'html':
            return html({ autoCloseTags: true, matchClosingTags: true });
        case 'css':
            return css();
        case 'js':
            return javascript();
    }
}

function createLightTheme(height: string): Extension {
    return EditorView.theme(
        {
            '&': {
                height,
                fontSize: '13.5px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
            },
            '.cm-scroller': {
                overflow: 'auto',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            },
            '.cm-gutters': {
                backgroundColor: '#f8fafc',
                color: '#94a3b8',
                borderRight: '1px solid #e2e8f0',
            },
            '.cm-activeLineGutter': {
                backgroundColor: '#eef2ff',
                color: '#1e293b',
            },
            '.cm-activeLine': {
                backgroundColor: '#f8fafc',
            },
        },
        { dark: false },
    );
}

function createDarkTheme(height: string): Extension {
    return [
        oneDark,
        EditorView.theme(
            {
                '&': {
                    height,
                    fontSize: '13.5px',
                },
                '.cm-scroller': {
                    overflow: 'auto',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                },
            },
            { dark: true },
        ),
    ];
}

export default function CodeEditorPane({
    language,
    value,
    onChange,
    dark = true,
    className = '',
    height = '100%',
}: CodeEditorPaneProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const themeCompartmentRef = useRef(new Compartment());
    const languageCompartmentRef = useRef(new Compartment());

    onChangeRef.current = onChange;

    useEffect(() => {
        if (!containerRef.current) return;

        const themeCompartment = themeCompartmentRef.current;
        const languageCompartment = languageCompartmentRef.current;

        const state = EditorState.create({
            doc: value,
            extensions: [
                lineNumbers(),
                highlightActiveLineGutter(),
                highlightSpecialChars(),
                history(),
                foldGutter(),
                drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                indentOnInput(),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                bracketMatching(),
                closeBrackets(),
                autocompletion(),
                highlightActiveLine(),
                EditorView.lineWrapping,
                keymap.of([
                    ...closeBracketsKeymap,
                    ...defaultKeymap,
                    ...historyKeymap,
                    ...foldKeymap,
                    ...completionKeymap,
                    indentWithTab,
                ]),
                languageCompartment.of(getLanguageExtension(language)),
                themeCompartment.of(dark ? createDarkTheme(height) : createLightTheme(height)),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChangeRef.current(update.state.doc.toString());
                    }
                }),
            ],
        });

        const view = new EditorView({
            state,
            parent: containerRef.current,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        const currentValue = view.state.doc.toString();
        if (value !== currentValue) {
            view.dispatch({
                changes: {
                    from: 0,
                    to: currentValue.length,
                    insert: value,
                },
            });
        }
    }, [value]);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        view.dispatch({
            effects: themeCompartmentRef.current.reconfigure(dark ? createDarkTheme(height) : createLightTheme(height)),
        });
    }, [dark, height]);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        view.dispatch({
            effects: languageCompartmentRef.current.reconfigure(getLanguageExtension(language)),
        });
    }, [language]);

    return <div ref={containerRef} className={`h-full w-full overflow-hidden ${className}`} data-language={language} />;
}
