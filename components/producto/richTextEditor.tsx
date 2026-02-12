"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic } from "lucide-react";

export const RichTextEditor = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[150px] w-full rounded-2xl border-2 border-slate-100 bg-slate-50 p-5 font-medium text-slate-700 outline-none transition-all focus:border-gold prose prose-sm max-w-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML()); // Guardamos el HTML (con <b> y <p>)
    },
  });

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Barra de herramientas flotante o fija */}
      <div className="flex gap-2 mb-2 bg-charcoal p-2 rounded-xl border border-border-soft">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded ${editor.isActive("bold") ? "bg-gold text-black" : "text-white hover:bg-white/10"}`}
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded ${editor.isActive("italic") ? "bg-gold text-black" : "text-white hover:bg-white/10"}`}
        >
          <Italic size={16} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};
