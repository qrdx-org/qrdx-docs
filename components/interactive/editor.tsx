'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { EditorView, keymap } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse bg-fd-muted/40" />,
});

/** An editable code block. ⌘/Ctrl-Enter runs it. */
export function CodeEditor({
  value,
  onChange,
  language,
  onRun,
  minHeight,
}: {
  value: string;
  onChange: (v: string) => void;
  language: 'javascript' | 'json';
  onRun?: () => void;
  minHeight?: string;
}) {
  const { resolvedTheme } = useTheme();
  const extensions = useMemo(
    () => [
      language === 'json' ? json() : javascript(),
      EditorView.lineWrapping,
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            onRun?.();
            return true;
          },
        },
      ]),
    ],
    [language, onRun]
  );
  return (
    <div className="qrdx-editor">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={resolvedTheme === 'dark' ? oneDark : 'light'}
        minHeight={minHeight}
        basicSetup={{ foldGutter: false, highlightActiveLine: true, autocompletion: true, lineNumbers: true }}
      />
    </div>
  );
}
