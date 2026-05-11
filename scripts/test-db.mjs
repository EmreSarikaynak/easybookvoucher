#!/usr/bin/env node

/**
 * Supabase veritabanı bağlantısını ve tabloları test eder
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// .env dosyasını yükle
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase bağlantı bilgileri bulunamadı (.env dosyasını kontrol edin)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Supabase bağlantısı test ediliyor...\n');
console.log('URL:', supabaseUrl);

async function testTables() {
  const tables = ['profiles', 'agencies', 'tours', 'vouchers', 'voucher_templates', 'payments'];
  
  console.log('\n📋 Tablo kontrolü:\n');
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table.padEnd(20)} - HATA: ${error.message}`);
      } else {
        console.log(`✅ ${table.padEnd(20)} - Mevcut (${count ?? 0} kayıt)`);
      }
    } catch (err) {
      console.log(`❌ ${table.padEnd(20)} - HATA: ${err.message}`);
    }
  }
}

async function testAuth() {
  console.log('\n🔐 Auth testi:\n');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Auth hatası:', error.message);
    } else if (session) {
      console.log('✅ Aktif oturum var');
      console.log('   User ID:', session.user.id);
      console.log('   Email:', session.user.email);
    } else {
      console.log('ℹ️  Aktif oturum yok (normal)');
    }
  } catch (err) {
    console.log('❌ Auth test hatası:', err.message);
  }
}

async function testStorage() {
  console.log('\n📦 Storage testi:\n');
  
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log('❌ Storage hatası:', error.message);
    } else {
      console.log('✅ Storage erişilebilir');
      console.log('   Bucket sayısı:', data.length);
      data.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });
    }
  } catch (err) {
    console.log('❌ Storage test hatası:', err.message);
  }
}

// Tüm testleri çalıştır
(async () => {
  try {
    await testTables();
    await testAuth();
    await testStorage();
    
    console.log('\n✨ Test tamamlandı\n');
  } catch (err) {
    console.error('\n💥 Beklenmeyen hata:', err);
    process.exit(1);
  }
})();
