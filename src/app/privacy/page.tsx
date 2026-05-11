import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
                        Gizlilik Politikası
                    </h1>

                    <div className="prose prose-sm md:prose-base max-w-none space-y-6" style={{ color: 'rgb(var(--color-gray-700))' }}>
                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                1. Genel Bilgiler
                            </h2>
                            <p>
                                EasyBookTours olarak, kullanıcılarımızın gizliliğine önem veriyoruz. Bu Gizlilik Politikası,
                                kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                2. Toplanan Bilgiler
                            </h2>
                            <p>
                                Platform'u kullanırken aşağıdaki bilgileri toplayabiliriz:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Kimlik Bilgileri:</strong> Ad, soyad, TC kimlik numarası</li>
                                <li><strong>İletişim Bilgileri:</strong> E-posta adresi, telefon numarası, adres</li>
                                <li><strong>Acente Bilgileri:</strong> Firma ünvanı, vergi numarası, ticaret sicil bilgileri</li>
                                <li><strong>İşlem Bilgileri:</strong> Bilet rezervasyonları, satış kayıtları, ödeme bilgileri</li>
                                <li><strong>Teknik Bilgiler:</strong> IP adresi, tarayıcı türü, işletim sistemi, cihaz bilgileri</li>
                                <li><strong>Kullanım Bilgileri:</strong> Platform üzerindeki aktiviteleriniz, tıklama verileri</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                3. Bilgilerin Kullanım Amaçları
                            </h2>
                            <p>
                                Topladığımız bilgileri şu amaçlarla kullanırız:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Hesabınızı oluşturmak ve yönetmek</li>
                                <li>Bilet işlemlerinizi gerçekleştirmek</li>
                                <li>Müşteri desteği sağlamak</li>
                                <li>Platform'u geliştirmek ve optimize etmek</li>
                                <li>Güvenlik ve dolandırıcılık önleme</li>
                                <li>Yasal yükümlülükleri yerine getirmek</li>
                                <li>Size özel teklifler ve bildirimler göndermek (izniniz dahilinde)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                4. Çerezler (Cookies)
                            </h2>
                            <p>
                                Platform'umuz, kullanıcı deneyimini iyileştirmek için çerezler kullanmaktadır:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Zorunlu Çerezler:</strong> Platform'un çalışması için gerekli</li>
                                <li><strong>Fonksiyonel Çerezler:</strong> Tercihlerinizi hatırlamak için</li>
                                <li><strong>Analitik Çerezler:</strong> Kullanım istatistikleri için</li>
                                <li><strong>Pazarlama Çerezleri:</strong> Kişiselleştirilmiş reklamlar için (izniniz ile)</li>
                            </ul>
                            <p className="mt-3">
                                Tarayıcınızın ayarlarından çerezleri yönetebilir veya silebilirsiniz. Ancak bazı çerezleri
                                devre dışı bırakmak Platform'un işlevselliğini etkileyebilir.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                5. Bilgilerin Paylaşılması
                            </h2>
                            <p>
                                Kişisel bilgilerinizi üçüncü taraflarla aşağıdaki durumlarda paylaşabiliriz:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Hizmet Sağlayıcılar:</strong> Ödeme işlemcileri, hosting sağlayıcıları</li>
                                <li><strong>Yasal Zorunluluklar:</strong> Mahkeme kararları, yasal düzenlemeler</li>
                                <li><strong>İş Ortakları:</strong> Tur operatörleri ve diğer seyahat şirketleri (işlem için gerekli olduğunda)</li>
                            </ul>
                            <p className="mt-3">
                                Bilgilerinizi asla pazarlama amaçlı üçüncü taraflara satmayız.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                6. Veri Güvenliği
                            </h2>
                            <p>
                                Kişisel verilerinizin güvenliğini sağlamak için endüstri standardı önlemler alıyoruz:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>SSL şifrelemesi ile veri aktarımı</li>
                                <li>Güvenli veri depolama sistemleri</li>
                                <li>Düzenli güvenlik testleri</li>
                                <li>Sınırlı erişim kontrolleri</li>
                                <li>Çalışan eğitimleri</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                7. Veri Saklama Süresi
                            </h2>
                            <p>
                                Kişisel verilerinizi, toplama amaçları için gerekli olduğu sürece veya yasal yükümlülüklerimiz
                                gerektirdiği sürece saklarız. Hesabınızı kapattığınızda, yasal saklama süreleri dışındaki
                                verileriniz silinir.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                8. Haklarınız
                            </h2>
                            <p>
                                Kişisel verilerinizle ilgili olarak aşağıdaki haklara sahipsiniz:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Verilerinize erişim talep etme</li>
                                <li>Verilerinizi düzeltme veya güncelleme</li>
                                <li>Verilerinizin silinmesini talep etme</li>
                                <li>Veri işlemeye itiraz etme</li>
                                <li>Veri taşınabilirliği talep etme</li>
                                <li>Pazarlama iletişimlerinden çıkma</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                9. Çocukların Gizliliği
                            </h2>
                            <p>
                                Platform'umuz 18 yaşın altındaki kişilere yönelik değildir. Bilerek 18 yaşın altındaki
                                kişilerden veri toplamıyoruz.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                10. Politika Değişiklikleri
                            </h2>
                            <p>
                                Bu Gizlilik Politikası'nı zaman zaman güncelleyebiliriz. Önemli değişiklikler için
                                e-posta ile bildirimde bulunacağız. Güncellenmiş politika, yayınlandığı tarihten itibaren
                                geçerli olacaktır.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                11. İletişim
                            </h2>
                            <p>
                                Gizlilik politikamız hakkında sorularınız için bizimle iletişime geçebilirsiniz:
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
