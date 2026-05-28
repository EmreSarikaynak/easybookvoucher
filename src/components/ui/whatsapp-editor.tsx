"use client";

import { useCallback, useRef, useState } from "react";
import { Bold, Italic, Strikethrough, Code, Eye, Pencil } from "lucide-react";
import { FormattedWhatsAppText } from "@/components/ui/formatted-whatsapp-text";
import { cn } from "@/lib/utils";

interface WhatsAppEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
  /** Masaüstünde yan yana canlı önizleme */
  showLivePreview?: boolean;
}

interface WrapDef {
  before: string;
  after: string;
}

const WRAPS = {
  bold: { before: "**", after: "**" },
  italic: { before: "_", after: "_" },
  strike: { before: "~", after: "~" },
  mono: { before: "`", after: "`" },
} satisfies Record<string, WrapDef>;

type WrapKey = keyof typeof WRAPS;

/**
 * WhatsApp formatına uygun (kalın/italik/üstü çizili/mono) metin editörü.
 * Yazılan biçim hem duyuruda hem WhatsApp gönderiminde aynı şekilde görünür.
 */
export function WhatsAppEditor({
  value,
  onChange,
  placeholder,
  rows = 5,
  className,
  id,
  showLivePreview = true,
}: WhatsAppEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mobilePreview, setMobilePreview] = useState(false);

  const wrapSelection = useCallback(
    (key: WrapKey) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const { before, after } = WRAPS[key];
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end);
      const placeholderText =
        selected ||
        (key === "bold"
          ? "kalın metin"
          : key === "italic"
            ? "italik metin"
            : key === "strike"
              ? "üstü çizili"
              : "kod");
      const next =
        value.slice(0, start) +
        before +
        placeholderText +
        after +
        value.slice(end);

      onChange(next);

      requestAnimationFrame(() => {
        const cursor = start + before.length + placeholderText.length;
        ta.focus();
        ta.setSelectionRange(
          selected ? cursor : start + before.length,
          cursor
        );
      });
    },
    [onChange, value]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const map: Record<string, WrapKey> = {
      b: "bold",
      i: "italic",
      u: "strike",
    };
    const key = map[e.key.toLowerCase()];
    if (!key) return;
    e.preventDefault();
    wrapSelection(key);
  };

  const editorPanel = (
    <>
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-1.5 py-1">
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            label="Kalın (**...**)"
            onClick={() => wrapSelection("bold")}
            icon={<Bold className="h-3.5 w-3.5" />}
          />
          <ToolbarButton
            label="İtalik (_..._)"
            onClick={() => wrapSelection("italic")}
            icon={<Italic className="h-3.5 w-3.5" />}
          />
          <ToolbarButton
            label="Üstü çizili (~...~)"
            onClick={() => wrapSelection("strike")}
            icon={<Strikethrough className="h-3.5 w-3.5" />}
          />
          <ToolbarButton
            label="Kod (`...`)"
            onClick={() => wrapSelection("mono")}
            icon={<Code className="h-3.5 w-3.5" />}
          />
        </div>
        {showLivePreview && (
          <button
            type="button"
            onClick={() => setMobilePreview((p) => !p)}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          >
            {mobilePreview ? (
              <>
                <Pencil className="h-3 w-3" /> Düzenle
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" /> Önizle
              </>
            )}
          </button>
        )}
      </div>

      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "block w-full resize-y bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none",
          showLivePreview && mobilePreview && "hidden md:block"
        )}
      />

      {showLivePreview && mobilePreview && (
        <div className="min-h-[120px] border-t bg-muted/20 px-3 py-2.5 md:hidden">
          <PreviewContent value={value} />
        </div>
      )}

      <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>
          <code className="rounded bg-muted px-1 font-mono">**kalın**</code>
          {" · "}
          <code className="rounded bg-muted px-1 font-mono">_italik_</code>
          {" · "}
          <code className="rounded bg-muted px-1 font-mono">~üstü çizili~</code>
          {" · "}
          <code className="rounded bg-muted px-1 font-mono">`kod`</code>
          <span className="hidden sm:inline">
            {" "}
            — Ctrl/Cmd+B ile kalın
          </span>
        </span>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-background shadow-sm",
        className
      )}
    >
      {showLivePreview ? (
        <div className="grid md:grid-cols-2 md:divide-x">
          <div>{editorPanel}</div>
          <div className="hidden min-h-[140px] bg-muted/15 md:block">
            <div className="border-b bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              Canlı önizleme
            </div>
            <div className="px-3 py-2.5">
              <PreviewContent value={value} />
            </div>
          </div>
        </div>
      ) : (
        editorPanel
      )}
    </div>
  );
}

function PreviewContent({ value }: { value: string }) {
  if (!value.trim()) {
    return (
      <p className="text-sm text-muted-foreground">
        Yazdığınız metin burada WhatsApp ve duyuru sayfasındaki gibi görünür.
      </p>
    );
  }
  return <FormattedWhatsAppText text={value} />;
}

interface ToolbarButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function ToolbarButton({ label, icon, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {icon}
    </button>
  );
}
