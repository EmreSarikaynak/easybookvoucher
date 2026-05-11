import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function KVKKPage() {
    return (
        <div className="min-h-screen gradient-bg-login p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Back to Login */}
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-white hover:underline mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Giriş Ekranına Dön
                </Link>

                {/* Content Card */}
                <div className="bg-white rounded-2xl p-6 md:p-10 shadow-xl">
                    <h1 className="text-3xl font-bold mb-6" style={{ color: 'rgb(var(--color-gray-900))' }}>
                        Kişisel Verilerin Korunması Kanunu (KVKK) Aydınlatma Metni
                    </h1>

                    <div className="prose prose-sm md:prose-base max-w-none space-y-6" style={{ color: 'rgb(var(--color-gray-700))' }}>
                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                1. Veri Sorumlusu
                            </h2>
                            <p>
                                6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz;
                                veri sorumlusu olarak EasyBookTours ("Şirket") tarafından aşağıda açıklanan kapsamda işlenebilecektir.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                2. Kişisel Verilerin İşlenme Amacı
                            </h2>
                            <p>
                                Toplanan kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Acente hesabınızın oluşturulması ve yönetilmesi</li>
                                <li>Bilet işlemlerinizin gerçekleştirilmesi</li>
                                <li>Müşteri hizmetlerinin sağlanması</li>
                                <li>Güvenlik ve dolandırıcılık önleme</li>
                                <li>Yasal yükümlülüklerin yerine getirilmesi</li>
                                <li>İstatistiksel analiz ve raporlama</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                3. İşlenen Kişisel Veriler
                            </h2>
                            <p>
                                Platformumuz üzerinden toplanan kişisel verileriniz:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Kimlik bilgileri (ad, soyad)</li>
                                <li>İletişim bilgileri (e-posta, telefon)</li>
                                <li>Acente bilgileri (firma adı, vergi numarası)</li>
                                <li>İşlem bilgileri (bilet rezervasyonları, satışlar)</li>
                                <li>Teknik bilgiler (IP adresi, cihaz bilgileri, tarayıcı bilgileri)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                4. Kişisel Verilerin Aktarılması
                            </h2>
                            <p>
                                Toplanan kişisel verileriniz, KVKK'nın 8. ve 9. maddelerinde belirtilen kişisel veri işleme şartları
                                çerçevesinde yurt içinde ve yurt dışında bulunan üçüncü kişilere aktarılabilecektir.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                5. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi
                            </h2>
                            <p>
                                Kişisel verileriniz, elektronik ortamda web sitesi ve mobil uygulama üzerinden toplanmaktadır.
                                Toplama işlemi KVKK'nın 5. ve 6. maddelerinde belirtilen işleme şartları kapsamında yapılmaktadır.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                6. Kişisel Veri Sahibinin Hakları
                            </h2>
                            <p>
                                KVKK'nın 11. maddesi uyarınca, kişisel veri sahipleri olarak aşağıdaki haklara sahipsiniz:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                                <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
                                <li>Kişisel verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                                <li>Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme</li>
                                <li>Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</li>
                                <li>KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerin silinmesini veya yok edilmesini isteme</li>
                                <li>Kişisel verilerin kanuna aykırı olarak işlenmesi sebebiyle zarara uğraması hâlinde zararın giderilmesini talep etme</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                7. İletişim
                            </h2>
                            <p>
                                KVKK kapsamındaki haklarınızı kullanmak için aşağıdaki iletişim kanallarını kullanabilirsiniz:
                            </p>
                            <div className="bg-gray-50 p-4 rounded-lg mt-3">
                                <p><strong>E-posta:</strong> peterpan4865@gmail.com</p>
                                <p><strong>Telefon:</strong> +90 536 602 93 97</p>
                            </div>
                        </section>

                        <p className="text-sm text-gray-500 mt-8">
                            Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
