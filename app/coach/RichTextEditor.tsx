"use client";

import { useRef, useState } from "react";

function stripUnsafeHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

export default function RichTextEditor({ name, initialValue = "", placeholder = "" }: { name: string; initialValue?: string; placeholder?: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(initialValue);

  function sync() {
    setValue(stripUnsafeHtml(editorRef.current?.innerHTML ?? ""));
  }

  function command(commandName: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(commandName, false, commandValue);
    sync();
  }

  function addLink() {
    const url = window.prompt("Enter the link URL");
    if (!url) return;
    command("createLink", url);
  }

  return (
    <div className="richTextField">
      <div className="richTextToolbar" role="toolbar" aria-label="Formatting options">
        <button type="button" onClick={() => command("bold")} aria-label="Bold"><strong>B</strong></button>
        <button type="button" onClick={() => command("italic")} aria-label="Italic"><em>I</em></button>
        <button type="button" onClick={() => command("underline")} aria-label="Underline"><span className="underlineTool">U</span></button>
        <span className="toolbarDivider" />
        <button type="button" onClick={() => command("insertUnorderedList")} aria-label="Bulleted list">• List</button>
        <button type="button" onClick={() => command("insertOrderedList")} aria-label="Numbered list">1. List</button>
        <span className="toolbarDivider" />
        <button type="button" onClick={addLink} aria-label="Add link">Link</button>
        <button type="button" onClick={() => command("removeFormat")} aria-label="Clear formatting">Clear</button>
      </div>
      <div
        ref={editorRef}
        className="richTextEditor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: initialValue }}
        onInput={sync}
        onBlur={sync}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
