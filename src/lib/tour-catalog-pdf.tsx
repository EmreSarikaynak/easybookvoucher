/**
 * Tur Kataloğu PDF üretimi (Faz 4 — Premium tasarım) — @react-pdf/renderer tabanlı.
 *
 * Görsel dil: lacivert + turkuaz + beyaz; dalga kenarlı header/footer,
 * display başlık (Fredoka), turkuaz badge'ler, ikonlu Dahil/Dahil Değil listeleri.
 *
 * Sayfa düzeni: A4 dikey, sayfa başına 2 tur kartı (üst + alt). Bir kart sığmazsa
 * otomatik bir sonraki sayfaya kayar (React-PDF wrap=false).
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  pdf,
  Svg,
  Path,
  Circle,
  Rect,
  Polyline,
  Line,
} from "@react-pdf/renderer";
import {
  getCatalogPageUi,
  getTourContentForLang,
  type CatalogLang,
  type TourTranslations,
} from "@/lib/tour-i18n";
import { EASYBOOK_CONTACT } from "@/lib/constants";
import { ICONS, pickIconForText, type IconKey } from "@/lib/catalog-icons";

export interface CatalogTourInput {
  id: string;
  name: string;
  description: string | null;
  duration: string | null;
  pickup_locations: string[];
  images: string[];
  translations?: TourTranslations | null;
  tour_managers?: { name: string; phone: string }[];
  departure_days?: string[];
  departure_time?: string | null;
  meeting_point?: string | null;
}

export interface CatalogPriceInput {
  tour_id: string;
  price_adult: number;
  price_child: number;
}

// --- Font kaydı ---
// Cloudflare Workers'da local filesystem yok; URL ile register etmek gerekiyor.
// Node dev modunda lokal yol çalışır. Üretim: bir baseUrl (deploy origin) gerekir.
// generateTourCatalogPdfBuffer çağrılırken baseUrl iletilirse fontlar oradan fetch edilir.
let fontsRegisteredFor: string | null = null;

function isNodeWithFs(): boolean {
  // Cloudflare Workers'da process.versions.node yok ama nodejs_compat varsa olabilir.
  // Asıl ölçü: fs/sync read mümkün mü? Heuristik: process.cwd() != "/" değilse local kullan.
  try {
    return typeof process !== "undefined" && !!process.versions?.node && process.cwd() !== "/";
  } catch {
    return false;
  }
}

function registerFonts(baseUrl?: string | null) {
  // Aynı kaynak için tekrar register yapma (cache)
  const key = baseUrl ?? (isNodeWithFs() ? "__local__" : "__missing__");
  if (fontsRegisteredFor === key) return;

  let regular: string;
  let bold: string;
  let display: string;

  if (baseUrl) {
    const base = baseUrl.replace(/\/$/, "");
    regular = `${base}/fonts/NotoSans-Regular.ttf`;
    bold = `${base}/fonts/NotoSans-Bold.ttf`;
    // Display başlıklar için de NotoSans-Bold kullan: Fredoka Türkçe (ğ/ı),
    // Kiril (RU) ve Lehçe karakterleri içermiyordu → "Katalou" gibi bozulmalar.
    display = `${base}/fonts/NotoSans-Bold.ttf`;
  } else if (isNodeWithFs()) {
    // Node FS yolu — string concat yeterli (node:path import'una gerek yok,
    // tarayıcı bundle'ı temiz kalsın diye)
    const cwd = process.cwd().replace(/\\/g, "/");
    regular = `${cwd}/public/fonts/NotoSans-Regular.ttf`;
    bold = `${cwd}/public/fonts/NotoSans-Bold.ttf`;
    display = `${cwd}/public/fonts/NotoSans-Bold.ttf`;
  } else {
    throw new Error(
      "Font yüklenemedi: ne baseUrl ne de local FS erişimi var. generateTourCatalogPdfBuffer'a logoUrl/baseUrl geçirin veya yerel Node'da çalıştırın."
    );
  }

  Font.register({
    family: "NotoSans",
    fonts: [
      { src: regular, fontWeight: 400 },
      { src: bold, fontWeight: 700 },
    ],
  });
  Font.register({ family: "Display", fonts: [{ src: display, fontWeight: 700 }] });
  Font.registerHyphenationCallback((w) => [w]);
  fontsRegisteredFor = key;
}

// --- Marka & palet ---
const NAVY = "#0D3B66";        // header / başlık koyu
const NAVY_DEEP = "#0A2C4D";   // kapak başlığı
const BRAND = "#1E5A99";       // ana mavi
const TEAL = "#38B6C6";        // turkuaz aksan
const TEAL_LIGHT = "#9CE0EA";  // açık turkuaz çizgi
const CYAN_SOFT = "#E8F6FA";   // info kart arka plan
const BG_PAGE = "#FFFFFF";
const TEXT_DARK = "#0D2A47";
const TEXT_MUTED = "#5A6E84";
const BORDER = "#D6E2EE";

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 9.5,
    color: TEXT_DARK,
    backgroundColor: BG_PAGE,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 28,
    position: "relative",
  },

  // -- header / footer dekoratif --
  headerSvg: { position: "absolute", top: 0, left: 0, right: 0 },
  footerSvg: { position: "absolute", bottom: 0, left: 0, right: 0 },

  headerRow: {
    position: "absolute",
    top: 14,
    left: 28,
    right: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBrandWrap: { flexDirection: "row", alignItems: "center" },
  headerLogo: { width: 26, height: 26, marginRight: 8, borderRadius: 4, objectFit: "contain" },
  headerBrandText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Display", fontWeight: 700, letterSpacing: 0.2 },
  headerTagline: { color: "#9CC8E8", fontSize: 8, marginTop: 1, letterSpacing: 1 },
  headerRight: { color: "#FFFFFF", fontSize: 10, fontWeight: 700, opacity: 0.92 },

  footerRow: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: { color: "#FFFFFF", fontSize: 8.5, fontWeight: 700 },

  // -- A4 arkaplan: sayfa pozisyonu bazlı (admin tarafından global olarak yüklenir).
  //    Tüm sayfayı kaplar; opacity 1 — kullanıcı resmi kendisi hazırlar. --
  bgFull: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PAGE_W,
    height: PAGE_H,
  },
  pageBackgroundImg: { width: PAGE_W, height: PAGE_H, objectFit: "cover" },

  // -- 2-kart layout (sayfada ortalanmış) --
  cardsContainer: { flex: 1, justifyContent: "center" },
  cardSeparator: {
    height: 0.7,
    backgroundColor: TEAL_LIGHT,
    marginVertical: 8,
  },

  card: {
    paddingVertical: 4,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  cardTitleBlock: { flex: 1, paddingRight: 8 },
  cardTitle: {
    fontFamily: "Display",
    fontWeight: 700,
    fontSize: 24,
    color: NAVY_DEEP,
    lineHeight: 1.05,
  },
  cardSubtitle: {
    fontFamily: "NotoSans",
    fontSize: 11,
    color: TEAL,
    marginTop: 2,
  },

  durationBadge: {
    backgroundColor: TEAL,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  durationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: 700,
    marginLeft: 5,
  },

  // -- görsel strip --
  imageStrip: {
    flexDirection: "row",
    marginVertical: 6,
  },
  imageCell: { padding: 1.5 },
  imageBox: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: 4,
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#EAF0F5",
    borderRadius: 4,
  },

  // -- alt bilgi grid --
  infoGrid: { flexDirection: "row", marginTop: 4 },
  leftCol: { flex: 1.5, paddingRight: 10 },
  rightCol: {
    flex: 1,
    backgroundColor: CYAN_SOFT,
    borderRadius: 6,
    padding: 8,
    borderWidth: 0.5,
    borderColor: TEAL_LIGHT,
  },

  description: {
    fontSize: 9,
    color: TEXT_DARK,
    lineHeight: 1.45,
    textAlign: "justify",
  },

  sectionHeader: {
    fontSize: 9,
    fontWeight: 700,
    color: NAVY,
    marginBottom: 3,
    letterSpacing: 0.3,
  },

  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 5,
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  infoPillText: {
    fontSize: 8.5,
    color: NAVY,
    fontWeight: 700,
    marginLeft: 4,
  },

  iconListItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  iconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  iconListText: { fontSize: 8.5, color: TEXT_DARK, flex: 1, lineHeight: 1.3 },

  priceBox: {
    marginTop: 6,
    backgroundColor: NAVY,
    borderRadius: 6,
    padding: 8,
  },
  priceLabel: {
    fontSize: 7.5,
    color: "#9CC8E8",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  priceWho: { color: "#B8DBF2", fontSize: 9 },
  priceValue: { color: "#FFFFFF", fontSize: 13, fontWeight: 700 },
  priceOnReq: { color: "#FFFFFF", fontSize: 11, fontWeight: 700 },

  // -- KAPAK --
  coverWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  coverLogo: { width: 120, height: 120, marginBottom: 18, objectFit: "contain" },
  coverBrand: {
    fontFamily: "Display",
    fontWeight: 700,
    fontSize: 36,
    color: NAVY_DEEP,
    letterSpacing: 0.5,
  },
  coverTagline: {
    fontSize: 12,
    color: TEAL,
    marginTop: 4,
  },
  coverTitle: {
    fontFamily: "Display",
    fontWeight: 700,
    fontSize: 48,
    color: BRAND,
    marginTop: 30,
    textAlign: "center",
  },
  coverSub: { fontSize: 13, color: TEXT_MUTED, marginTop: 16 },
  coverDate: { fontSize: 11, color: TEXT_MUTED, marginTop: 6 },

  // -- TOC --
  tocTitle: {
    fontFamily: "Display",
    fontWeight: 700,
    fontSize: 26,
    color: NAVY_DEEP,
    marginBottom: 16,
  },
  tocRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingVertical: 5,
    borderBottomWidth: 0.4,
    borderBottomColor: BORDER,
  },
  tocIndex: {
    width: 28,
    fontSize: 10,
    color: TEAL,
    fontWeight: 700,
  },
  tocName: { flex: 1, fontSize: 11, color: TEXT_DARK },
  tocPage: { fontSize: 10, color: TEXT_MUTED, marginLeft: 6 },

  // -- CONTACT --
  contactTitle: {
    fontFamily: "Display",
    fontWeight: 700,
    fontSize: 30,
    color: NAVY_DEEP,
    marginBottom: 22,
  },
  contactCard: {
    backgroundColor: CYAN_SOFT,
    borderRadius: 10,
    padding: 20,
    borderWidth: 0.5,
    borderColor: TEAL_LIGHT,
  },
  contactRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  contactIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactLabel: { fontSize: 8.5, color: TEXT_MUTED, letterSpacing: 0.4, textTransform: "uppercase" },
  contactValue: { fontSize: 13, color: NAVY_DEEP, fontWeight: 700 },
});

// --- Yardımcılar ---

function arrayBufferToBase64(buf: ArrayBuffer): string {
  // Node tarafında Buffer hızlı; tarayıcıda btoa kullan.
  if (typeof globalThis.Buffer !== "undefined") {
    return globalThis.Buffer.from(buf).toString("base64");
  }
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk))
    );
  }
  return btoa(binary);
}

/**
 * @react-pdf/renderer SADECE jpg/png gömebilir (webp/gif desteklenmez → sessizce
 * boş render edilir). Tarayıcıda üretildiğimiz için jpg/png olmayan görselleri
 * canvas ile PNG'ye çeviririz. Node tarafında (canvas yok) olduğu gibi döneriz.
 */
async function convertToPngDataUrl(
  buf: ArrayBuffer,
  contentType: string
): Promise<string | null> {
  try {
    if (typeof createImageBitmap === "undefined") return null; // Node / DOM yok
    const blob = new Blob([buf], { type: contentType || "image/png" });
    const bitmap = await createImageBitmap(blob);
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0);
      const out = await canvas.convertToBlob({ type: "image/png" });
      return `data:image/png;base64,${arrayBufferToBase64(await out.arrayBuffer())}`;
    }
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0);
      return canvas.toDataURL("image/png");
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    // jpg/png ise doğrudan göm; değilse (webp vs.) PNG'ye çevirmeyi dene.
    if (!/image\/(jpe?g|png)/i.test(contentType)) {
      const converted = await convertToPngDataUrl(buf, contentType);
      if (converted) return converted;
    }
    return `data:${contentType};base64,${arrayBufferToBase64(buf)}`;
  } catch {
    return null;
  }
}

function formatDurationLabel(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/_/g, " ").trim();
}
function formatTime(raw: string | null | undefined): string {
  if (!raw) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(raw);
  if (!m) return raw;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}
function formatDays(days: string[] | undefined, weekdays: Record<string, string>): string {
  if (!days?.length) return "";
  const order = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const sorted = order.filter((d) => days.includes(d));
  if (sorted.length === 7) return `${weekdays.monday} — ${weekdays.sunday}`;
  // Kısalt: Pzt, Sal, ...
  return sorted.map((d) => weekdays[d].slice(0, 3)).join(", ");
}

// --- SVG yardımcıları ---

interface DecoIconProps {
  iconKey: IconKey;
  size: number;
  color: string;
}

function DecoIcon({ iconKey, size, color }: DecoIconProps) {
  const ico = ICONS[iconKey];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {ico.paths.map((d, i) => (
        <Path
          key={`p${i}`}
          d={d}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
      {(ico.shapes ?? []).map((s, i) => {
        if (s.kind === "circle")
          return <Circle key={`s${i}`} cx={s.cx} cy={s.cy} r={s.r} stroke={color} strokeWidth={2} fill="none" />;
        if (s.kind === "rect")
          return (
            <Rect
              key={`s${i}`}
              x={s.x}
              y={s.y}
              width={s.width}
              height={s.height}
              rx={s.rx ?? 0}
              ry={s.ry ?? s.rx ?? 0}
              stroke={color}
              strokeWidth={2}
              fill="none"
            />
          );
        if (s.kind === "polyline")
          return (
            <Polyline
              key={`s${i}`}
              points={s.points}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          );
        if (s.kind === "line")
          return (
            <Line
              key={`s${i}`}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        return null;
      })}
    </Svg>
  );
}

// Dalga kenarlı navy header arkaplanı
function HeaderWave() {
  return (
    <Svg style={styles.headerSvg} width={PAGE_W} height={60} viewBox={`0 0 ${PAGE_W} 60`}>
      {/* Navy alan */}
      <Path
        d={`M 0,0 L ${PAGE_W},0 L ${PAGE_W},42 C ${PAGE_W * 0.75},58 ${PAGE_W * 0.5},32 ${PAGE_W * 0.25},50 C ${PAGE_W * 0.1},58 0,46 0,46 Z`}
        fill={NAVY}
      />
      {/* İnce turkuaz dalga vurgu */}
      <Path
        d={`M 0,52 C ${PAGE_W * 0.25},38 ${PAGE_W * 0.55},62 ${PAGE_W * 0.75},48 C ${PAGE_W * 0.9},40 ${PAGE_W},52 ${PAGE_W},52`}
        stroke={TEAL}
        strokeWidth={1.5}
        fill="none"
      />
    </Svg>
  );
}

function FooterWave() {
  return (
    <Svg style={styles.footerSvg} width={PAGE_W} height={50} viewBox={`0 0 ${PAGE_W} 50`}>
      <Path
        d={`M 0,8 C ${PAGE_W * 0.25},-6 ${PAGE_W * 0.5},18 ${PAGE_W * 0.75},8 C ${PAGE_W * 0.9},2 ${PAGE_W},10 ${PAGE_W},10 L ${PAGE_W},50 L 0,50 Z`}
        fill={NAVY}
      />
      <Path
        d={`M 0,4 C ${PAGE_W * 0.2},-4 ${PAGE_W * 0.4},14 ${PAGE_W * 0.65},6 C ${PAGE_W * 0.85},-2 ${PAGE_W},6 ${PAGE_W},6`}
        stroke={TEAL}
        strokeWidth={1.5}
        fill="none"
      />
    </Svg>
  );
}

// --- Header/Footer JSX ---

interface HFProps {
  lang: CatalogLang;
  logoDataUrl?: string | null;
  pageTitle?: string;
}

function CatalogHeader({ logoDataUrl, pageTitle, lang }: HFProps) {
  const ui = getCatalogPageUi(lang);
  const tagline = lang === "tr" ? "1999'DAN BERİ" : lang === "ru" ? "С 1999 ГОДА" : "SINCE 1999";
  return (
    <View fixed>
      <HeaderWave />
      <View style={styles.headerRow}>
        <View style={styles.headerBrandWrap}>
          {logoDataUrl ? <Image style={styles.headerLogo} src={logoDataUrl} /> : null}
          <View>
            <Text style={styles.headerBrandText}>Easy Book Tours</Text>
            <Text style={styles.headerTagline}>{tagline}</Text>
          </View>
        </View>
        <Text style={styles.headerRight}>{pageTitle || ui.catalogTitle}</Text>
      </View>
    </View>
  );
}

function CatalogFooter({ lang }: HFProps) {
  const ui = getCatalogPageUi(lang);
  return (
    <View fixed>
      <FooterWave />
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {EASYBOOK_CONTACT.phoneDisplay}  ·  {EASYBOOK_CONTACT.website}
        </Text>
        <Text
          style={styles.footerText}
          render={({ pageNumber, totalPages }) => ui.pageOf(pageNumber, totalPages)}
        />
      </View>
    </View>
  );
}

// --- Tur Kartı ---

interface TourCardProps {
  lang: CatalogLang;
  tour: CatalogTourInput;
  imgs: (string | null)[];
  price: { price_adult: number; price_child: number };
  currency: CatalogPdfCurrency;
}

function ImageStrip({ images }: { images: (string | null)[] }) {
  // En fazla 4 görsel — tek sıra, 4 hücre
  const list = images.slice(0, 4);
  while (list.length < 4) list.push(null);

  const cellWidth = `${100 / 4}%`;
  return (
    <View style={[styles.imageStrip, { height: 72 }]}>
      {list.map((src, i) => (
        <View key={i} style={[styles.imageCell, { width: cellWidth, height: "100%" }]}>
          {src ? (
            <Image style={styles.imageBox} src={src} />
          ) : (
            <View style={styles.imagePlaceholder} />
          )}
        </View>
      ))}
    </View>
  );
}

function IconListLine({ icon, text, color }: { icon: IconKey; text: string; color: string }) {
  return (
    <View style={styles.iconListItem}>
      <View style={[styles.iconCircle, { borderWidth: 0.5, borderColor: TEAL_LIGHT }]}>
        <DecoIcon iconKey={icon} size={11} color={color} />
      </View>
      <Text style={styles.iconListText}>{text}</Text>
    </View>
  );
}

function TourCard({ lang, tour, imgs, price, currency }: TourCardProps) {
  const ui = getCatalogPageUi(lang);
  const content = getTourContentForLang(tour.translations, lang, tour.name, tour.description);
  const priceLabel = ui.pricesEur.replace("EUR", currency);

  const duration = formatDurationLabel(tour.duration);
  const days = formatDays(tour.departure_days, ui.weekdays);
  const depTime = formatTime(tour.departure_time);
  const meeting = (tour.meeting_point ?? "").trim();
  const desc = content.description?.trim() ?? "";

  const included = (content.included ?? []).filter((x) => x.trim());
  const excluded = (content.excluded ?? []).filter((x) => x.trim());

  const showAdult = price.price_adult > 0;
  const showChild = price.price_child > 0;
  const hasAnyPrice = showAdult || showChild;

  // Sığma için max madde sınırı: 2/sayfa zorunluluğu nedeniyle. Eğer kullanıcı
  // çok fazla madde girdiyse alt madde alt karta itilir; truncate edilmez —
  // sığmazsa otomatik bir sonraki sayfaya kayar (wrap davranışı).
  return (
    <View style={styles.card} wrap={false}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>{content.name}</Text>
        </View>
        {duration ? (
          <View style={styles.durationBadge}>
            <DecoIcon iconKey="clock" size={12} color="#FFFFFF" />
            <Text style={styles.durationBadgeText}>
              {ui.duration}: {duration}
            </Text>
          </View>
        ) : null}
      </View>

      <ImageStrip images={imgs} />

      <View style={styles.infoGrid}>
        <View style={styles.leftCol}>
          {desc ? <Text style={styles.description}>{desc}</Text> : null}

          {/* Departure/meeting pill row */}
          {(days || depTime || meeting) ? (
            <View style={styles.pillRow}>
              {days ? (
                <View style={styles.infoPill}>
                  <DecoIcon iconKey="calendar" size={10} color={NAVY} />
                  <Text style={styles.infoPillText}>{days}</Text>
                </View>
              ) : null}
              {depTime ? (
                <View style={styles.infoPill}>
                  <DecoIcon iconKey="clock" size={10} color={NAVY} />
                  <Text style={styles.infoPillText}>{depTime}</Text>
                </View>
              ) : null}
              {meeting ? (
                <View style={styles.infoPill}>
                  <DecoIcon iconKey="mapPin" size={10} color={NAVY} />
                  <Text style={styles.infoPillText}>{meeting}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Excluded — sola alıyoruz çünkü Dahil Olanlar info kartında olacak */}
          {excluded.length > 0 ? (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.sectionHeader}>{ui.excluded}</Text>
              {excluded.map((item, i) => (
                <IconListLine key={i} icon="x" text={item} color="#C8362E" />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.rightCol}>
          {included.length > 0 ? (
            <>
              <Text style={styles.sectionHeader}>{ui.included}</Text>
              {included.map((item, i) => (
                <IconListLine
                  key={i}
                  icon={pickIconForText(item, "check")}
                  text={item}
                  color={NAVY}
                />
              ))}
            </>
          ) : null}

          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>{priceLabel}</Text>
            {hasAnyPrice ? (
              <>
                {showAdult ? (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceWho}>{ui.adultPrice}</Text>
                    <Text style={styles.priceValue}>{currency} {price.price_adult}</Text>
                  </View>
                ) : null}
                {showChild ? (
                  <View style={[styles.priceRow, { marginTop: 3 }]}>
                    <Text style={styles.priceWho}>{ui.childPrice}</Text>
                    <Text style={styles.priceValue}>{currency} {price.price_child}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.priceOnReq}>{ui.priceOnRequest}</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// --- Sayfalar ---

function PageBackground({ src }: { src?: string | null }) {
  if (!src) return null;
  return (
    <View style={styles.bgFull}>
      <Image style={styles.pageBackgroundImg} src={src} />
    </View>
  );
}

interface TourPageProps extends HFProps {
  pair: { tour: CatalogTourInput; imgs: (string | null)[]; price: { price_adult: number; price_child: number } }[];
  pageBg?: string | null;
  currency: CatalogPdfCurrency;
}

function ToursPage({ lang, pair, pageBg, currency }: TourPageProps) {
  return (
    <Page size="A4" style={styles.page}>
      <PageBackground src={pageBg} />
      <View style={styles.cardsContainer}>
        {pair[0] && <TourCard lang={lang} currency={currency} {...pair[0]} />}
        {pair[1] && <View style={styles.cardSeparator} />}
        {pair[1] && <TourCard lang={lang} currency={currency} {...pair[1]} />}
      </View>
    </Page>
  );
}

function CoverPage({
  lang,
  logoDataUrl,
  tourCount,
  currency,
  pageBg,
}: HFProps & { tourCount: number; currency: CatalogPdfCurrency; pageBg?: string | null }) {
  const ui = getCatalogPageUi(lang);
  const today = new Date().toLocaleDateString(
    lang === "tr" ? "tr-TR" : lang === "ru" ? "ru-RU" : "en-GB",
    { day: "2-digit", month: "long", year: "numeric" }
  );
  const tagline = lang === "tr" ? "1999'dan beri" : lang === "ru" ? "с 1999 года" : "since 1999";
  const priceSubLabel = ui.pricesEur.replace("EUR", currency);
  return (
    <Page size="A4" style={styles.page}>
      <PageBackground src={pageBg} />
      <View style={styles.coverWrap}>
        {logoDataUrl ? <Image style={styles.coverLogo} src={logoDataUrl} /> : null}
        <Text style={styles.coverBrand}>Easy Book Tours</Text>
        <Text style={styles.coverTagline}>{tagline}</Text>
        <Text style={styles.coverTitle}>{ui.catalogTitle}</Text>
        <Text style={styles.coverSub}>{ui.toursCountSuffix(tourCount)}  ·  {priceSubLabel}</Text>
        <Text style={styles.coverDate}>{today}</Text>
      </View>
    </Page>
  );
}

function TocPage({
  lang,
  entries,
  pageBg,
}: HFProps & { entries: { name: string; page: number }[]; pageBg?: string | null }) {
  const ui = getCatalogPageUi(lang);
  return (
    <Page size="A4" style={styles.page}>
      <PageBackground src={pageBg} />
      <Text style={styles.tocTitle}>{ui.tableOfContents}</Text>
      {entries.map((e, i) => (
        <View key={i} style={styles.tocRow}>
          <Text style={styles.tocIndex}>{String(i + 1).padStart(2, "0")}</Text>
          <Text style={styles.tocName}>{e.name}</Text>
          <Text style={styles.tocPage}>{e.page}</Text>
        </View>
      ))}
    </Page>
  );
}


// --- Public API ---

export type CatalogPdfCurrency = "EUR" | "TRY";

export interface GenerateCatalogOpts {
  tours: CatalogTourInput[];
  prices: CatalogPriceInput[];
  lang: CatalogLang;
  agencyName?: string | null;
  logoUrl?: string | null;
  /** Fiyat etiketlerinde kullanılacak para birimi (default EUR). */
  currency?: CatalogPdfCurrency;
  /** Cloudflare Workers'da fontları URL'den fetch etmek için gerekli (ör. "https://bodrumdayiz.com.tr").
   *  Verilmezse Node FS'den yüklenir; Workers'da bu başarısız olur. */
  baseUrl?: string | null;
  /** Sayfa pozisyonu bazlı arkaplan URL'leri. 1 = Kapak, 2 = İçindekiler, 3..N = Tur sayfaları. */
  pageBackgrounds?: Record<number, string>;
}

function chunkPairs<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
}

/** Ortak: opts'tan Document JSX'i kurar + tüm görselleri data URL'e dönüştürür. */
async function buildCatalogDocument(opts: GenerateCatalogOpts) {
  registerFonts(opts.baseUrl ?? null);

  const { tours, prices, lang, logoUrl } = opts;
  const currency: CatalogPdfCurrency = opts.currency ?? "EUR";
  const pageBackgrounds = opts.pageBackgrounds ?? {};
  const priceMap = new Map(prices.map((p) => [p.tour_id, p]));

  const logoDataUrl = logoUrl ? await fetchImageAsDataUrl(logoUrl) : null;

  const urlSet = new Set<string>();
  for (const t of tours) {
    for (const u of (t.images ?? []).slice(0, 4)) if (u) urlSet.add(u);
  }
  for (const bg of Object.values(pageBackgrounds)) {
    if (bg) urlSet.add(bg);
  }
  const cache = new Map<string, string | null>();
  await Promise.all(
    Array.from(urlSet).map(async (u) => cache.set(u, await fetchImageAsDataUrl(u)))
  );

  // data URL yüklenemediyse orijinal URL'yi fallback olarak ver — react-pdf kendi yükler
  const resolveBg = (pageNumber: number): string | null => {
    const url = pageBackgrounds[pageNumber];
    if (!url) return null;
    return cache.get(url) ?? url;
  };

  const cards = tours.map((t) => ({
    tour: t,
    imgs: (t.images ?? []).slice(0, 4).map((u) => cache.get(u) ?? null),
    price: priceMap.get(t.id) ?? { price_adult: 0, price_child: 0 },
  }));

  const pairs = chunkPairs(cards);

  const tocEntries = tours.map((t, i) => {
    const c = getTourContentForLang(t.translations, lang, t.name, t.description);
    return { name: c.name, page: 3 + Math.floor(i / 2) };
  });

  return (
    <Document>
      <CoverPage
        lang={lang}
        logoDataUrl={logoDataUrl}
        tourCount={tours.length}
        currency={currency}
        pageBg={resolveBg(1)}
      />
      <TocPage lang={lang} logoDataUrl={logoDataUrl} entries={tocEntries} pageBg={resolveBg(2)} />
      {pairs.map((pair, i) => (
        <ToursPage
          key={i}
          lang={lang}
          logoDataUrl={logoDataUrl}
          pair={pair}
          pageBg={resolveBg(3 + i)}
          currency={currency}
        />
      ))}
    </Document>
  );
}

/**
 * Tarayıcıda çağrılır. Cloudflare Workers'da yoga-layout WASM çalışmadığı için
 * üretim akışı bu fonksiyondur — sunucu sadece dataset'i JSON olarak döner,
 * client PDF'i kendi render eder.
 */
export async function generateTourCatalogPdfBlob(
  opts: GenerateCatalogOpts
): Promise<Blob> {
  const doc = await buildCatalogDocument(opts);
  const instance = pdf(doc);
  return instance.toBlob();
}

/**
 * Node tarafı (geliştirme + WhatsApp upload flow için Storage'a yüklenecek
 * binary'i alır). Workers'da çağırma — yoga WASM hatası verir.
 */
export async function generateTourCatalogPdfBuffer(
  opts: GenerateCatalogOpts
): Promise<Buffer> {
  const doc = await buildCatalogDocument(opts);
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const ab = await blob.arrayBuffer();
  return Buffer.from(ab);
}
