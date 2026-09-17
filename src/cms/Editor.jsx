import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { useLanguage } from "../i18n/language-context";
import { renderContent, safeLink } from "./content";

export default function Editor({ value, onChange, label, disabled = false }) {
  const {
    t: { cms: c },
  } = useLanguage();
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: false,
          defaultProtocol: "https",
          isAllowedUri: (url) => !!safeLink(url),
        },
      }),
    ],
    content: renderContent(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON()),
  });
  useEditorState({ editor, selector: (ctx) => ctx.editor?.state });
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  if (!editor) return <p>{c.loading}</p>;
  function link() {
    const href = window.prompt(
      c.linkPrompt,
      editor.getAttributes("link").href || "",
    );
    if (href === null) return;
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!safeLink(href)) {
      window.alert(c.invalidLink);
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: safeLink(href) })
      .run();
  }
  const buttons = [
    [
      c.paragraph,
      () => editor.chain().focus().setParagraph().run(),
      editor.isActive("paragraph"),
    ],
    [
      c.heading2,
      () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      editor.isActive("heading", { level: 2 }),
    ],
    [
      c.heading3,
      () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      editor.isActive("heading", { level: 3 }),
    ],
    [
      c.bold,
      () => editor.chain().focus().toggleBold().run(),
      editor.isActive("bold"),
    ],
    [
      c.italic,
      () => editor.chain().focus().toggleItalic().run(),
      editor.isActive("italic"),
    ],
    [
      c.bulletList,
      () => editor.chain().focus().toggleBulletList().run(),
      editor.isActive("bulletList"),
    ],
    [
      c.orderedList,
      () => editor.chain().focus().toggleOrderedList().run(),
      editor.isActive("orderedList"),
    ],
    [c.link, link, editor.isActive("link")],
    [
      c.undo,
      () => editor.chain().focus().undo().run(),
      undefined,
      !editor.can().undo(),
    ],
    [
      c.redo,
      () => editor.chain().focus().redo().run(),
      undefined,
      !editor.can().redo(),
    ],
  ];
  return (
    <div>
      <div className="cms-toolbar" role="group" aria-label={label}>
        {buttons.map(([name, action, active, unavailable]) => (
          <button
            key={name}
            type="button"
            onClick={action}
            aria-pressed={active}
            disabled={disabled || unavailable}
          >
            {name}
          </button>
        ))}
      </div>
      <EditorContent className="article-prose" editor={editor} />
    </div>
  );
}
