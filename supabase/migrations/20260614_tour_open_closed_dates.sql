-- Tur gunu kisitlamasi: bilet yalnizca turun acik oldugu gunlere kesilebilsin.
-- departure_days (haftalik tekrar eden gunler) zaten var. Bu migration
-- belirli tarih istisnalarini ekler:
--   closed_dates: haftalik olarak acik ama o gun kapali (tatil vb.)
--   open_dates:   haftalik gunlerden olmasa da o gun ekstra acik
-- Uygunluk kurali (src/lib/tour-days.ts -> isTourOpenOn):
--   closed_dates kazanir -> open_dates -> departure_days bos ise her gun -> haftanin gunu departure_days icinde mi.

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS closed_dates DATE[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS open_dates   DATE[] DEFAULT '{}';

COMMENT ON COLUMN tours.closed_dates IS
  'Istisna: haftalik departure_days icinde olsa bile bu tarihlerde tur YOK (tatil vb.). Uygunlukta closed_dates her zaman kazanir.';

COMMENT ON COLUMN tours.open_dates IS
  'Istisna: departure_days haftalik gunlerinden olmasa da bu tarihlerde tur VAR (ekstra sefer).';
