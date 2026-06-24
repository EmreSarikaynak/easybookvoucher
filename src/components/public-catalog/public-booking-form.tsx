"use client";

import { useState, FormEvent, useMemo } from "react";

interface PublicBookingFormProps {
  agencyCode: string;
  tourId: string;
  tourName: string;
  adultPriceEur: number;
  childPriceEur: number;
  infantPriceEur: number;
  pickupOptions: string[];
}

export function PublicBookingForm({
  agencyCode,
  tourId,
  tourName,
  adultPriceEur,
  childPriceEur,
  infantPriceEur,
  pickupOptions,
}: PublicBookingFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [hotel, setHotel] = useState("");
  const [pickupPlace, setPickupPlace] = useState("");
  const [tourDate, setTourDate] = useState("");
  const [paxAdult, setPaxAdult] = useState(2);
  const [paxChild, setPaxChild] = useState(0);
  const [paxInfant, setPaxInfant] = useState(0);
  const [notes, setNotes] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ voucherNo: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const total = useMemo(
    () =>
      paxAdult * adultPriceEur +
      paxChild * childPriceEur +
      paxInfant * infantPriceEur,
    [paxAdult, paxChild, paxInfant, adultPriceEur, childPriceEur, infantPriceEur]
  );

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !phone.trim() || !tourDate || paxAdult < 1) {
      setErrorMsg("Lütfen tüm zorunlu alanları doldurun (en az 1 yetişkin gerekir).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyCode,
          tourId,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim() || null,
          hotel: hotel.trim(),
          pickupPlace: pickupPlace.trim() || hotel.trim(),
          tourDate,
          paxAdult,
          paxChild,
          paxInfant,
          notes: notes.trim(),
          honeypot,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        voucherNo?: string;
        error?: string;
      };
      if (!res.ok || !data.success || !data.voucherNo) {
        throw new Error(data.error || "Rezervasyon oluşturulamadı");
      }
      setSuccess({ voucherNo: data.voucherNo });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Beklenmeyen hata");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-3 text-center">
        <div className="text-4xl">✅</div>
        <h3 className="text-xl font-bold text-green-800">Rezervasyon Alındı!</h3>
        <p className="text-sm text-green-700">
          Bilet numaranız: <strong>{success.voucherNo}</strong>
        </p>
        <p className="text-sm text-gray-600">
          Bilet detaylarınız WhatsApp üzerinden gönderildi. Tur günü için size yakın bir tarihte
          tekrar iletişime geçeceğiz.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border rounded-xl p-5 sm:p-6 shadow-sm space-y-4"
    >
      <h2 className="text-lg font-bold text-gray-900">Rezervasyon Bilgileri</h2>

      <p className="text-xs text-gray-500">
        Tur: <strong>{tourName}</strong>
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="Ad Soyad / Full Name"
          required
          value={name}
          onChange={setName}
          placeholder="John Smith"
        />
        <Field
          label="Telefon / Phone"
          required
          value={phone}
          onChange={setPhone}
          placeholder="+44 7917 522354"
          type="tel"
        />
      </div>

      <Field
        label="E-posta / Email (opsiyonel)"
        value={email}
        onChange={setEmail}
        placeholder="ornek@mail.com"
        type="email"
      />

      <Field
        label="Otel / Hotel"
        value={hotel}
        onChange={setHotel}
        placeholder="Jasmin Beach Hotel"
      />

      {pickupOptions.length > 0 ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alış Noktası / Pickup
          </label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={pickupPlace}
            onChange={(e) => setPickupPlace(e.target.value)}
          >
            <option value="">Seçiniz / Select</option>
            {pickupOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <Field
          label="Alış Noktası / Pickup"
          value={pickupPlace}
          onChange={setPickupPlace}
          placeholder="Otel önü / Hotel reception"
        />
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tur Tarihi / Tour Date *
        </label>
        <input
          type="date"
          required
          min={minDate}
          value={tourDate}
          onChange={(e) => setTourDate(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NumberField label="Yetişkin / Adult" value={paxAdult} onChange={setPaxAdult} min={1} />
        <NumberField label="Çocuk / Child" value={paxChild} onChange={setPaxChild} min={0} />
        <NumberField label="Bebek / Infant" value={paxInfant} onChange={setPaxInfant} min={0} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notlar / Notes (opsiyonel)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Özel istekleriniz..."
        />
      </div>

      <input
        type="text"
        name="company"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          opacity: 0,
          pointerEvents: "none",
          height: 0,
          width: 0,
        }}
      />

      {total > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-blue-800 font-medium">Toplam / Total:</span>
          <span className="text-2xl font-bold text-blue-700">€{total.toFixed(0)}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-md transition"
      >
        {submitting ? "Gönderiliyor..." : "Rezervasyonu Tamamla / Complete Booking"}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Rezervasyonunuz alındıktan sonra WhatsApp üzerinden bilet bilgileriniz iletilecektir.
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        min={min}
        max={20}
        value={value}
        onChange={(e) => onChange(Math.max(min, parseInt(e.target.value, 10) || min))}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
