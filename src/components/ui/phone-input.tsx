"use client";

import { useState, useRef, useEffect } from "react";
import { normalizeStoredPhone } from "@/lib/phone";

interface CountryCode {
  flag: string;
  code: string; // dial code e.g. "+90"
  abbr: string; // short label e.g. "TR"
  name: string; // full name for search
}

const COUNTRY_CODES: CountryCode[] = [
  { flag: "🇹🇷", code: "+90",  abbr: "TR",  name: "Türkiye" },
  { flag: "🇩🇪", code: "+49",  abbr: "DE",  name: "Almanya" },
  { flag: "🇷🇺", code: "+7",   abbr: "RU",  name: "Rusya" },
  { flag: "🇬🇧", code: "+44",  abbr: "GB",  name: "İngiltere" },
  { flag: "🇫🇷", code: "+33",  abbr: "FR",  name: "Fransa" },
  { flag: "🇸🇦", code: "+966", abbr: "SA",  name: "Suudi Arabistan" },
  { flag: "🇰🇼", code: "+965", abbr: "KW",  name: "Kuveyt" },
  { flag: "🇦🇪", code: "+971", abbr: "AE",  name: "BAE" },
  { flag: "🇶🇦", code: "+974", abbr: "QA",  name: "Katar" },
  { flag: "🇮🇷", code: "+98",  abbr: "IR",  name: "İran" },
  { flag: "🇮🇱", code: "+972", abbr: "IL",  name: "İsrail" },
  { flag: "🇳🇱", code: "+31",  abbr: "NL",  name: "Hollanda" },
  { flag: "🇧🇪", code: "+32",  abbr: "BE",  name: "Belçika" },
  { flag: "🇮🇹", code: "+39",  abbr: "IT",  name: "İtalya" },
  { flag: "🇪🇸", code: "+34",  abbr: "ES",  name: "İspanya" },
  { flag: "🇵🇱", code: "+48",  abbr: "PL",  name: "Polonya" },
  { flag: "🇺🇦", code: "+380", abbr: "UA",  name: "Ukrayna" },
  { flag: "🇸🇪", code: "+46",  abbr: "SE",  name: "İsveç" },
  { flag: "🇳🇴", code: "+47",  abbr: "NO",  name: "Norveç" },
  { flag: "🇩🇰", code: "+45",  abbr: "DK",  name: "Danimarka" },
  { flag: "🇨🇭", code: "+41",  abbr: "CH",  name: "İsviçre" },
  { flag: "🇦🇹", code: "+43",  abbr: "AT",  name: "Avusturya" },
  { flag: "🇬🇷", code: "+30",  abbr: "GR",  name: "Yunanistan" },
  { flag: "🇧🇬", code: "+359", abbr: "BG",  name: "Bulgaristan" },
  { flag: "🇷🇴", code: "+40",  abbr: "RO",  name: "Romanya" },
  { flag: "🇺🇸", code: "+1",   abbr: "US",  name: "ABD" },
  { flag: "🇨🇦", code: "+1",   abbr: "CA",  name: "Kanada" },
  { flag: "🇧🇷", code: "+55",  abbr: "BR",  name: "Brezilya" },
  { flag: "🇦🇺", code: "+61",  abbr: "AU",  name: "Avustralya" },
  { flag: "🇯🇵", code: "+81",  abbr: "JP",  name: "Japonya" },
  { flag: "🇨🇳", code: "+86",  abbr: "CN",  name: "Çin" },
  { flag: "🇮🇳", code: "+91",  abbr: "IN",  name: "Hindistan" },
  { flag: "🇰🇷", code: "+82",  abbr: "KR",  name: "Güney Kore" },
  { flag: "🇲🇽", code: "+52",  abbr: "MX",  name: "Meksika" },
  { flag: "🇵🇹", code: "+351", abbr: "PT",  name: "Portekiz" },
  { flag: "🇨🇿", code: "+420", abbr: "CZ",  name: "Çekya" },
  { flag: "🇭🇺", code: "+36",  abbr: "HU",  name: "Macaristan" },
  { flag: "🇸🇰", code: "+421", abbr: "SK",  name: "Slovakya" },
  { flag: "🇭🇷", code: "+385", abbr: "HR",  name: "Hırvatistan" },
  { flag: "🇷🇸", code: "+381", abbr: "RS",  name: "Sırbistan" },
  { flag: "🇸🇮", code: "+386", abbr: "SI",  name: "Slovenya" },
  { flag: "🇦🇿", code: "+994", abbr: "AZ",  name: "Azerbaycan" },
  { flag: "🇬🇪", code: "+995", abbr: "GE",  name: "Gürcistan" },
  { flag: "🇰🇿", code: "+7",   abbr: "KZ",  name: "Kazakistan" },
  { flag: "🇪🇬", code: "+20",  abbr: "EG",  name: "Mısır" },
  { flag: "🇲🇦", code: "+212", abbr: "MA",  name: "Fas" },
  { flag: "🇹🇳", code: "+216", abbr: "TN",  name: "Tunus" },
  { flag: "🇯🇴", code: "+962", abbr: "JO",  name: "Ürdün" },
  { flag: "🇱🇧", code: "+961", abbr: "LB",  name: "Lübnan" },
  { flag: "🇵🇰", code: "+92",  abbr: "PK",  name: "Pakistan" },
  { flag: "🇧🇩", code: "+880", abbr: "BD",  name: "Bangladeş" },
  { flag: "🇳🇬", code: "+234", abbr: "NG",  name: "Nijerya" },
  { flag: "🇿🇦", code: "+27",  abbr: "ZA",  name: "G. Afrika" },
  { flag: "🇰🇪", code: "+254", abbr: "KE",  name: "Kenya" },
  { flag: "🇫🇮", code: "+358", abbr: "FI",  name: "Finlandiya" },
  { flag: "🇮🇪", code: "+353", abbr: "IE",  name: "İrlanda" },
  { flag: "🇳🇿", code: "+64",  abbr: "NZ",  name: "Yeni Zelanda" },
  { flag: "🇦🇷", code: "+54",  abbr: "AR",  name: "Arjantin" },
  { flag: "🇨🇴", code: "+57",  abbr: "CO",  name: "Kolombiya" },
  { flag: "🇵🇪", code: "+51",  abbr: "PE",  name: "Peru" },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}

/**
 * Parses a stored phone value like "+905551234567" into {dialCode: "+90", local: "5551234567"}
 */
function parsePhone(value: string): { country: CountryCode; local: string } {
  const defaultCountry = COUNTRY_CODES[0]; // Turkey
  if (!value) return { country: defaultCountry, local: "" };

  // Try to match known dial codes (longest first to avoid prefix conflicts)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (value.startsWith(c.code)) {
      return { country: c, local: value.slice(c.code.length).trimStart() };
    }
  }
  // No match — assume Turkey
  return { country: defaultCountry, local: value };
}

export function PhoneInput({ value, onChange, id, className }: PhoneInputProps) {
  const parsed = parsePhone(value);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(parsed.country);
  const [localNumber, setLocalNumber] = useState(parsed.local);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync outward value when either part changes (kayıt formatı: +905551234567)
  useEffect(() => {
    if (!localNumber) {
      onChange("");
      return;
    }
    let local = localNumber.replace(/[^0-9]/g, "");
    // +90 seçiliyken 0553... → 553... (çift 90 önlenir)
    if (selectedCountry.code === "+90" && local.startsWith("0")) {
      local = local.slice(1);
    }
    const raw = `${selectedCountry.code}${local}`;
    onChange(normalizeStoredPhone(raw) ?? raw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, localNumber]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.abbr.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search)
  );

  const handleSelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className={`flex gap-0 ${className ?? ""}`} ref={dropdownRef} style={{ position: "relative" }}>
      {/* Country selector button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-2 border border-r-0 border-input rounded-l-md bg-muted hover:bg-muted/80 transition-colors text-sm font-medium shrink-0 h-10"
        title={selectedCountry.name}
        aria-label="Ülke kodu seç"
      >
        <span className="text-base leading-none">{selectedCountry.flag}</span>
        <span className="text-xs text-muted-foreground font-mono">{selectedCountry.code}</span>
        <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Phone number input */}
      <input
        id={id}
        type="tel"
        value={localNumber}
        onChange={(e) => setLocalNumber(e.target.value.replace(/[^0-9\s\-]/g, ""))}
        placeholder="5XX XXX XX XX"
        className="flex h-10 flex-1 rounded-r-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        autoComplete="tel-national"
      />

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute top-full left-0 z-50 mt-1 w-64 rounded-md border border-border bg-popover shadow-lg"
          style={{ maxHeight: "280px", display: "flex", flexDirection: "column" }}
        >
          {/* Search */}
          <div className="p-2 border-b border-border">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ülke ara..."
              className="w-full rounded-sm border border-input bg-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">Sonuç bulunamadı</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={`${c.abbr}-${c.code}`}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left ${
                    selectedCountry.abbr === c.abbr && selectedCountry.code === c.code
                      ? "bg-accent font-medium"
                      : ""
                  }`}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">{c.code}</span>
                  <span className="text-xs truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">{c.abbr}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
