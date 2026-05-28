import { whatsappMarkdownToHtml } from "@/lib/whatsapp-markdown";
import { cn } from "@/lib/utils";

interface FormattedWhatsAppTextProps {
  text: string;
  className?: string;
  /** Boş metinde gösterilecek placeholder */
  emptyLabel?: string;
}

/** WhatsApp biçimlendirmesini (**kalın**, _italik_ vb.) güvenli HTML olarak render eder. */
export function FormattedWhatsAppText({
  text,
  className,
  emptyLabel,
}: FormattedWhatsAppTextProps) {
  const html = whatsappMarkdownToHtml(text);
  if (!html && emptyLabel) {
    return <span className={cn("text-muted-foreground", className)}>{emptyLabel}</span>;
  }
  return (
    <div
      className={cn(
        "text-sm whitespace-pre-wrap break-words leading-relaxed [&_strong]:font-semibold [&_em]:italic [&_s]:line-through [&_code]:font-mono",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
