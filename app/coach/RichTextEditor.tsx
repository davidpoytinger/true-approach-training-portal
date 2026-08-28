"use client";

import { useRef, useState } from "react";

function stripUnsafeHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

const buttonStyle = {
  appearance: "none" as const,
  border: "1px solid #d1d5db",
  borderRadius: 7,
  background: "#ffffff",
  color: "#17191c",
  cursor: "pointer",
  minWidth: 34,
  height: 32,
  padding: "0 10px",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center"
};

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
    <div
      className="richTextField"
      style={{
        width: "100%",
        border: "1px solid #cfd2d6",
        borderRadius: 9,
        background: "#fff",
        overflow: "hidden"
      }}
    >
      <div
        className="richTextToolbar"
        role="toolbar"
        aria-label="Formatting options"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          padding: 8,
          borderBottom: "1px solid #d9dce0",
          background: "#f7f7f8"
        }}
      >
        <button style={buttonStyle} type="button" onClick={() => command("bold")} aria-label="Bold" title="Bold"><strong>B</strong></button>
        <button style={buttonStyle} type="button" onClick={() => command("italic")} aria-label="Italic" title="Italic"><em>I</em></button>
        <button style={buttonStyle} type="button" onClick={() => command("underline")} aria-label="Underline" title="Underline"><span style={{ textDecoration: "underline" }}>U</span></button>
        <span style={{ width: 1, height: 24, background: "#d2d4d7", margin: "0 2px" }} />
        <button style={buttonStyle} type="button" onClick={() => command("insertUnorderedList")} aria-label="Bulleted list" title="Bulleted List">• List</button>
        <button style={buttonStyle} type="button" onClick={() => command("insertOrderedList")} aria-label="Numbered list" title="Numbered List">1. List</button>
        <span style={{ width: 1, height: 24, background: "#d2d4d7", margin: "0 2px" }} />
        <button style={buttonStyle} type="button" onClick={addLink} aria-label="Add link" title="Add Link">🔗 Link</button>
        <button style={{ ...buttonStyle, fontWeight: 600 }} type="button" onClick={() => command("removeFormat")} aria-label="Clear formatting" title="Clear Formatting">Clear</button>
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
        style={{
          width: "100%",
          minHeight: 170,
          padding: "14px 12px",
          outline: "none",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 16,
          fontWeight: 400,
          lineHeight: 1.5,
          background: "#fff"
        }}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
