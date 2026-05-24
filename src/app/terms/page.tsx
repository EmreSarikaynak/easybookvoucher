import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PlatformFooter } from '@/components/layout/platform-footer';
import { SecestaFooter } from '@/components/layout/secesta-footer';

export default function TermsPage() {
    return (
        <div className="min-h-screen gradient-bg-login flex flex-col">
            <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
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
                        Kullanım Şartları
                    </h1>

                    <div className="prose prose-sm md:prose-base max-w-none space-y-6" style={{ color: 'rgb(var(--color-gray-700))' }}>
                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                1. Hizmet Kapsamı
                            </h2>
                            <p>
                                EasyBookTours Bilet Yönetim Sistemi ("Platform"), acentelerin bilet satış ve rezervasyon işlemlerini
                                yönetmelerine olanak sağlayan bir yazılım hizmetidir. Platform'u kullanarak bu kullanım şartlarını
                                kabul etmiş sayılırsınız.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                2. Hesap Oluşturma ve Güvenlik
                            </h2>
                            <p>
                                Platform'u kullanabilmek için bir acente hesabı oluşturmanız gerekmektedir. Hesap bilgilerinizin
                                güvenliğinden siz sorumlusunuz.
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Hesap bilgilerinizi gizli tutmalı ve üçüncü kişilerle paylaşmamalısınız</li>
                                <li>Şifrenizi düzenli olarak değiştirmelisiniz</li>
                                <li>Hesabınızda yetkisiz bir kullanım tespit ederseniz derhal bize bildirmelisiniz</li>
                                <li>Yanlış veya eksik bilgi vermemelisiniz</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                3. Kullanım Kuralları
                            </h2>
                            <p>
                                Platform'u kullanırken aşağıdaki kurallara uymalısınız:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Yürürlükteki tüm yasa ve yönetmeliklere uygun hareket etmek</li>
                                <li>Başkalarının haklarına saygı göstermek</li>
                                <li>Sistemin güvenliğini tehlikeye atacak faaliyetlerde bulunmamak</li>
                                <li>Platform'u kötüye kullanmamak veya spam göndermemek</li>
                                <li>Sahte veya yanıltıcı bilgi girmemek</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                4. Ödeme ve Faturalandırma
                            </h2>
                            <p>
                                Platform kullanım ücretleri, seçtiğiniz abonelik planına göre değişmektedir. Ödeme koşulları:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Ödemeler aylık veya yıllık olarak tahsil edilir</li>
                                <li>Fiyatlar önceden bildirimde bulunularak değiştirilebilir</li>
                                <li>İptal durumunda kalan süre için ücret iadesi yapılmaz</li>
                                <li>Geciken ödemeler hesabın askıya alınmasına neden olabilir</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                5. Fikri Mülkiyet Hakları
                            </h2>
                            <p>
                                Platform'daki tüm içerik, yazılım, tasarım ve diğer materyaller EasyBookTours'un veya
                                lisans verenlerin mülkiyetindedir ve telif hakkı yasaları ile korunmaktadır.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                6. Hizmetin Değiştirilmesi ve Sonlandırılması
                            </h2>
                            <p>
                                EasyBookTours, Platform'u herhangi bir zamanda değiştirme, askıya alma veya sonlandırma hakkını saklı tutar.
                                Önemli değişiklikler için önceden bildirimde bulunulacaktır.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                7. Sorumluluk Sınırlaması
                            </h2>
                            <p>
                                Platform "olduğu gibi" sunulmaktadır. EasyBookTours, Platform'un kesintisiz veya hatasız çalışacağını
                                garanti etmez. Kullanımdan kaynaklanan zararlardan sorumlu tutulamaz.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3" style={{ color: 'rgb(var(--color-gray-900))' }}>
                                8. İletişim
                            </h2>
                            <p>
                                Kullanım şartları hakkında sorularınız için:
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
            <PlatformFooter variant="login" />
            <SecestaFooter variant="login" showPlatformNote={false} />
        </div>
    );
}
