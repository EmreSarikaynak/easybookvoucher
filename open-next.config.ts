import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// buildCommand'i açıkça "next build" yapıyoruz. OpenNext'in varsayılan build
// komutu `npm run build` olduğundan ve `npm run build` artık
// `opennextjs-cloudflare build` çağırdığından, bunu sabitlemezsek sonsuz
// döngü oluşur.
const config = defineCloudflareConfig({});

export default {
  ...config,
  buildCommand: "next build",
};
