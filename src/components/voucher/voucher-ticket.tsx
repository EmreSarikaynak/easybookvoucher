"use client";

import { forwardRef, useState, useEffect } from "react";
import type { Voucher } from "@/lib/types";
import { CURRENCY_SYMBOLS } from "@/lib/types";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Phone, Globe, Instagram, Calendar, Clock, User, Home, Wallet, Facebook, Youtube, MessageCircle } from "lucide-react";
import { generateQRCodeDataURL } from "@/lib/qrcode";
import { DEFAULT_TOUR_URL, SELF_PICKUP, parseSelfPickup } from "@/lib/constants";
import { type Language, getTranslations, formatDateByLanguage, formatCurrencyByLanguage } from "@/lib/translations";

interface VoucherTicketProps {
  voucher: Voucher;
  lang?: Language;
}

export const VoucherTicket = forwardRef<HTMLDivElement, VoucherTicketProps>(
  ({ voucher, lang = 'tr' }, ref) => {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const t = getTranslations(lang);

    useEffect(() => {
      import("@/app/actions/settings").then(mod => {
        mod.getSetting("site_logo").then(logo => {
          if (typeof logo === 'string') setLogoUrl(logo);
        });
      });
    }, []);

    // Generate QR code - use tour URL if available, fallback to default YouTube URL
    useEffect(() => {
      const tourUrl = voucher.tour?.tour_url?.trim() || DEFAULT_TOUR_URL;
      // Always generate QR code (either with tour URL or fallback URL)
      generateQRCodeDataURL(tourUrl)
        .then(dataUrl => setQrCodeUrl(dataUrl))
        .catch(err => console.error("QR generation failed:", err));
    }, [voucher.tour?.tour_url]);

    const formatPrice = (price: number, currency: string) => {
      return formatCurrencyByLanguage(price, currency, lang);
    };

    const formatDate = (dateStr: string) => {
      return formatDateByLanguage(dateStr, lang);
    };

    // Compact PAX string
    const getPaxString = () => {
      const parts = [];
      if (voucher.pax_adult > 0) parts.push(`${voucher.pax_adult}Y`);
      if (voucher.pax_child > 0) parts.push(`${voucher.pax_child}Ç`);
      if (voucher.pax_infant > 0) parts.push(`${voucher.pax_infant}B`);
      return parts.join("+") || "0";
    };

    const restToPay = voucher.total_price - voucher.deposit_paid;
    const isPaidAll = restToPay <= 0;

    return (
      <div
        ref={ref}
        id="voucher-ticket"
        style={{
          width: "850px",
          height: "300px",
          minWidth: "850px",
          minHeight: "300px",
          maxWidth: "850px",
          maxHeight: "300px",
          fontFamily: "'Inter', sans-serif",
          backgroundColor: "#ffffff",
          overflow: "hidden",
          boxSizing: "border-box",
          padding: "5px"
        }}
      >
        <div style={{
          display: "flex",
          width: "840px",
          height: "290px",
          border: "2px solid #d1d5db",
          borderRadius: "8px",
          overflow: "hidden",
          boxSizing: "border-box"
        }}>

          {/* LEFT - 255px */}
          <div style={{
            width: "255px",
            minWidth: "255px",
            height: "100%",
            position: "relative",
            backgroundColor: "#f1f5f9",
            borderRight: "2px solid #e5e7eb",
            flexShrink: 0,
            overflow: "hidden"
          }}>
            {voucher.tour?.images?.[0] ? (
              <img
                src={voucher.tour.images[0]}
                alt="Tour"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  display: "block"
                }}
              />
            ) : (
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f1f5f9",
                color: "#94a3b8"
              }}>
                <span style={{ fontSize: "12px", fontWeight: 500 }}>No Image</span>
              </div>
            )}

            {/* Logo */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "85px",
              background: "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px",
              boxSizing: "border-box"
            }}>
              {logoUrl && (
                <img src={logoUrl} alt="Brand" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              )}
            </div>

            {/* TOURS Label */}
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              backgroundColor: "rgba(0,0,0,0.7)",
              textAlign: "center",
              padding: "8px 0"
            }}>
              <span style={{ color: "#fff", fontSize: "11px", fontWeight: 700, letterSpacing: "0.4em", textTransform: "uppercase" }}>{t.tours}</span>
            </div>
          </div>

          {/* MIDDLE - 401px */}
          <div style={{
            width: "401px",
            minWidth: "401px",
            height: "100%",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#fff",
            boxSizing: "border-box",
            flexShrink: 0
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: "10px",
              marginBottom: "6px"
            }}>
              <div style={{ flex: 1, paddingRight: "10px" }}>
                <h2 style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#111827",
                  margin: 0,
                  paddingTop: "2px",
                  whiteSpace: "nowrap",
                  lineHeight: "1.4"
                }}>
                  {voucher.tour?.name || "TUR ADI"}
                </h2>
                <div style={{ fontSize: "10px", color: "#ec4899", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "4px", lineHeight: "1.4" }}>BODRUM</div>
              </div>
              <div style={{ flexShrink: 0, backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "4px", padding: "5px 8px" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ color: "#9ca3af" }}>{t.ticket}:</span>
                  <span style={{ color: "#374151" }}>#{voucher.voucher_no}</span>
                </div>
                {(voucher.agency?.agency_code || voucher.sales_person?.agency?.agency_code) && (
                  <div style={{ fontSize: "8px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", marginTop: "3px", textAlign: "center" }}>
                    {t.agency}: {voucher.agency?.agency_code || voucher.sales_person?.agency?.agency_code}
                  </div>
                )}
              </div>
            </div>

            {/* Info Grid - 2x2 */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px 24px",
              flex: 1,
              paddingTop: "10px",
              paddingBottom: "10px",
              alignContent: "start"
            }}>
              {/* Misafir */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#9ca3af", fontWeight: 700, fontSize: "9px", textTransform: "uppercase", marginBottom: "4px", lineHeight: "1.4" }}>
                  <User style={{ width: "12px", height: "12px" }} /> {t.guest}
                </div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#1f2937", whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.4", paddingTop: "2px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {voucher.customer_name}
                </div>
              </div>

              {/* Otel/Oda */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#9ca3af", fontWeight: 700, fontSize: "9px", textTransform: "uppercase", marginBottom: "4px", lineHeight: "1.4" }}>
                  <Home style={{ width: "12px", height: "12px" }} /> {t.hotel} / {t.room}
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151", whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.4", paddingTop: "2px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {voucher.hotel || "-"} <span style={{ color: "#374151", fontWeight: 700 }}>/ {voucher.room_no || "-"}</span>
                </div>
              </div>

              {/* Tarih */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#9ca3af", fontWeight: 700, fontSize: "9px", textTransform: "uppercase", marginBottom: "4px", lineHeight: "1.4" }}>
                  <Calendar style={{ width: "12px", height: "12px" }} /> {t.date}
                </div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#374151", lineHeight: "1.4", paddingTop: "2px" }}>
                  {formatDate(voucher.tour_date)}
                </div>
              </div>

              {/* Alınış / Hareket Saati & PAX */}
              {(() => {
                const { isSelf, location } = parseSelfPickup(voucher.pickup_place);
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        color: isSelf ? "#16a34a" : "#ef4444",
                        fontWeight: 700, fontSize: "9px", textTransform: "uppercase", marginBottom: "4px", lineHeight: "1.4"
                      }}>
                        <Clock style={{ width: "12px", height: "12px" }} />
                        {isSelf ? t.departure : t.pickup}
                      </div>
                      {isSelf ? (
                        <>
                          <div style={{
                            fontSize: "10px", fontWeight: 700, color: "#16a34a", lineHeight: "1.4", paddingTop: "2px",
                            background: "#dcfce7", borderRadius: "4px", padding: "2px 6px", display: "inline-block", marginBottom: "2px"
                          }}>
                            {location ? location : "Kendi Geliyorlar"}
                          </div>
                          {voucher.pickup_time && (
                            <div style={{ fontSize: "15px", fontWeight: 800, color: "#16a34a", lineHeight: "1.4", paddingTop: "2px" }}>
                              {voucher.pickup_time.split(':').slice(0, 2).join(':')}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {voucher.pickup_place && (
                            <div style={{ fontSize: "10px", fontWeight: 600, color: "#374151", lineHeight: "1.4", paddingTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "130px" }}>
                              {voucher.pickup_place}
                            </div>
                          )}
                          <div style={{ fontSize: "15px", fontWeight: 800, color: "#dc2626", lineHeight: "1.4", paddingTop: "2px" }}>
                            {voucher.pickup_time ? voucher.pickup_time.split(':').slice(0, 2).join(':') : "10:00"}
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#9ca3af", fontWeight: 700, fontSize: "9px", textTransform: "uppercase", marginBottom: "4px", lineHeight: "1.4" }}>{t.pax}</div>
                      <div style={{ fontSize: "15px", fontWeight: 800, color: "#1f2937", lineHeight: "1.4", paddingTop: "2px" }}>
                        {getPaxString()}
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "8px", marginTop: "auto" }}>
              {/* Contact */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", flex: 1 }}>
                  {voucher.tour?.tour_managers && voucher.tour.tour_managers.length > 0 ? (
                    voucher.tour.tour_managers.map((manager, idx) => (
                      <span key={idx} style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 700, color: "#374151", fontSize: "9px" }}>
                        <Phone style={{ width: "11px", height: "11px", color: "#2563eb" }} />
                        <span style={{ color: "#6b7280", fontWeight: 600 }}>{t.tourManager}:</span>
                        {manager.name ? `${manager.name} ${manager.phone}` : manager.phone}
                      </span>
                    ))
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 700, color: "#374151", fontSize: "9px" }}>
                      <Phone style={{ width: "11px", height: "11px", color: "#2563eb" }} />
                      <span style={{ color: "#6b7280", fontWeight: 600 }}>{t.tourManager}:</span>
                      +90 536 602 93 97
                    </span>
                  )}
                  <MessageCircle style={{ width: "12px", height: "12px", color: "#16a34a" }} />
                </div>
                <div style={{ fontSize: "7px", color: "#9ca3af", fontWeight: 500, fontStyle: "italic", textAlign: "right", flexShrink: 0, paddingLeft: "8px" }}>
                  {t.since}
                </div>
              </div>

              {/* Social */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#f9fafb",
                border: "1px solid #f3f4f6",
                borderRadius: "4px",
                padding: "6px 8px"
              }}>
                <a href="#" style={{ display: "flex", alignItems: "center", gap: "5px", color: "#1f2937", fontWeight: 700, fontSize: "8px", textDecoration: "none" }}>
                  <Globe style={{ width: "13px", height: "13px", color: "#2563eb", flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.2 }}>easybooktours.com.tr</span>
                </a>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <a href="#" style={{ display: "flex", alignItems: "center", gap: "4px", color: "#1e40af", fontWeight: 600, fontSize: "7.5px", textDecoration: "none" }}>
                    <Facebook style={{ width: "12px", height: "12px", flexShrink: 0 }} /> <span style={{ lineHeight: 1.2 }}>/easybooktours</span>
                  </a>
                  <a href="#" style={{ display: "flex", alignItems: "center", gap: "4px", color: "#db2777", fontWeight: 600, fontSize: "7.5px", textDecoration: "none" }}>
                    <Instagram style={{ width: "12px", height: "12px", flexShrink: 0 }} /> <span style={{ lineHeight: 1.2 }}>/easybooktours</span>
                  </a>
                  <a href="#" style={{ display: "flex", alignItems: "center", gap: "4px", color: "#dc2626", fontWeight: 600, fontSize: "7.5px", textDecoration: "none" }}>
                    <Youtube style={{ width: "12px", height: "12px", flexShrink: 0 }} /> <span style={{ lineHeight: 1.2 }}>/easybooktours</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT - 180px */}
          <div style={{
            width: "180px",
            minWidth: "180px",
            height: "100%",
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#f8fafc",
            borderLeft: "2px solid #e5e7eb",
            boxSizing: "border-box",
            flexShrink: 0
          }}>
            <div>
              {/* Payment Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#6b7280", marginBottom: "8px" }}>
                <Wallet style={{ width: "14px", height: "14px" }} />
                <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.payment}</span>
              </div>

              {/* Amounts */}
              <div style={{ marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: 500 }}>{t.total}:</span>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "#111827" }}>
                    {formatPrice(voucher.total_price, voucher.currency)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: 500 }}>{t.paid}:</span>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#16a34a" }}>
                    {voucher.deposit_paid > 0 ? formatPrice(voucher.deposit_paid, voucher.currency) : "0.00"}
                  </span>
                </div>
              </div>

              {/* Remaining */}
              <div style={{ borderTop: "1px dashed #d1d5db", paddingTop: "6px", textAlign: "center" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1px" }}>
                  {t.remaining}
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: isPaidAll ? "#22c55e" : "#ef4444", lineHeight: 1 }}>
                  {isPaidAll ? "PAID" : formatPrice(restToPay, voucher.currency)}
                </div>
              </div>
            </div>

            {/* QR Code - Only shown if tour has URL */}
            {qrCodeUrl && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "7px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", marginBottom: "2px" }}>
                  {t.detailedInfo}
                </div>
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  style={{
                    width: "90px",
                    height: "90px",
                    display: "block",
                    margin: "0 auto",
                    imageRendering: "crisp-edges"
                  }}
                />
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }
);

VoucherTicket.displayName = "VoucherTicket";
