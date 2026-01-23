'use client';

import { useState } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import '@blocknote/core/fonts/inter.css';

// Simple ID generator (no external libs)
const createId = () => crypto.randomUUID();

type EditorData = {
  id: string;
  content: any[];
};

export default function EditorsPage() {
  const [editors, setEditors] = useState<EditorData[]>([]);

  const addEditor = () => {
    setEditors((prev) => [...prev, { id: createId(), content: [] }]);
  };

  const updateContent = (id: string, content: any[]) => {
    setEditors((prev) =>
      prev.map((e) => (e.id === id ? { ...e, content } : e))
    );
  };

  const removeEditor = (id: string) => {
    setEditors((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div style={{ padding: 16 }}>
      <button onClick={addEditor}>+ Add Editor</button>

      {editors.map((e) => (
        <Editor
          key={e.id}
          id={e.id}
          initialContent={e.content}
          onChange={updateContent}
          onDelete={removeEditor}
        />
      ))}
    </div>
  );
}

function Editor({
  id,
  initialContent,
  onChange,
  onDelete,
}: {
  id: string;
  initialContent: any[];
  onChange: (id: string, doc: any[]) => void;
  onDelete: (id: string) => void;
}) {
  const editor = useCreateBlockNote(
    initialContent.length > 0 ? { initialContent } : undefined
  );

  return (
    <div style={{ marginTop: 16, border: '1px solid #ccc', padding: 8 }}>
      <BlockNoteView
        editor={editor}
        onChange={() => onChange(id, editor.document)}
        theme="light"
      />
      <button onClick={() => onDelete(id)} style={{ marginTop: 8 }}>
        Delete Editor
      </button>
    </div>
  );
}
