# Push bildirimi sesleri

Foreground'daki açık sekmelerde push bildirimi geldiğinde
`src/components/pwa/notification-audio.tsx` bu klasörden ses dosyasını çalar.

## Dosyalar

- `notification.mp3` — birinci tercih (yoksa wav denenir)
- `notification.wav` — fallback (örnek bildirim sesi; varsayılan)

## Kendi sesinizi koymak

1. Kısa (1-2 saniye), normalize edilmiş bir mp3 dosyası hazırlayın.
2. `public/sounds/notification.mp3` adıyla bu klasöre koyun.
3. Tarayıcı dosyayı doğrudan yükleyecek; cache nedeniyle hard reload gerekebilir.

## Sınırlamalar

- iOS PWA: Özel ses çalmaz; iOS bildirim API'si özel ses kabul etmiyor.
- Android Chrome: Hem sistem bildirim sesi hem in-app ses birlikte çalar.
- Desktop: Tab açıkken in-app ses çalar; autoplay izni ilk kullanıcı
  etkileşiminden sonra aktif olur.
