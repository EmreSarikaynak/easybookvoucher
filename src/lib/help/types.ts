export interface HelpSection {
  title: string;
  paragraphs: string[];
  tips?: string[];
  /** Admin-only özellikleri işaretler */
  adminOnly?: boolean;
}

export interface HelpArticle {
  slug: string;
  title: string;
  category: string;
  summary: string;
  sections: HelpSection[];
}

export interface HelpNavLink {
  href: string;
  label: string;
}
