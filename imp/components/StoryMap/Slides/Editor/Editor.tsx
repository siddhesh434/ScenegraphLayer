'use client';

import { Block } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';

interface EditorProps {
  initialContent: Block[];
  onChange: (blocks: Block[]) => void;
}

export default function Editor({ initialContent, onChange }: EditorProps) {
  const editor = useCreateBlockNote(
    initialContent.length > 0 ? { initialContent } : undefined
  );

  if (!editor) return <p>Loading...</p>;

  return (
    <BlockNoteView
      editor={editor}
      onChange={() => onChange(editor.document)}
      theme="light"
    />
  );
}
