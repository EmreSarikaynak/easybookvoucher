import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// .env.local dosyasından okuma yapıyoruz (manuel parse)
const envRaw = fs.readFileSync('.env.local', 'utf8');
const envConfig = {};
envRaw.split('\n').forEach(line => {
  const [k, ...rest] = line.split('=');
  if (k && rest.length > 0) envConfig[k.trim()] = rest.join('=').trim();
});

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
  console.log('Seeding process started...');

  try {
    // 1. Rastgele bir Acente (Eğer varsa alalım, yoksa oluşturalım)
    let { data: agencies, error: agErr } = await supabase.from('agencies').select('id').limit(1);
    let agencyId = null;

    if (agencies && agencies.length > 0) {
      agencyId = agencies[0].id;
      console.log('Using existing agency:', agencyId);
    } else {
      console.log('No agencies found, creating a dummy agency...');
      const { data: newAg, error: newAgErr } = await supabase.from('agencies').insert({
        name: 'Test Acente',
        contact_person: 'Ahmet Test',
        email: 'ahmet@test.com',
        phone: '123456789',
        commission_rate: 10,
        agency_code: 'TEST'
      }).select().single();
      
      if (newAgErr) throw newAgErr;
      agencyId = newAg.id;
      console.log('Created dummy agency:', agencyId);
    }

    // 2. Örnek Turlar Ekleyelim
    console.log('Creating sample tours...');
    const { data: tours, error: tErr } = await supabase.from('tours').insert([
      {
        name: 'Örnek Sunset Turu (Test)',
        description: 'Test turu',
        currency: 'EUR',
        base_price_adult_eur: 50,
        base_price_child_eur: 25,
        is_active: true
      },
      {
        name: 'Korsan Gemisi (Test)',
        description: 'Çocuklar bedava',
        currency: 'EUR',
        base_price_adult_eur: 40,
        base_price_child_eur: 0,
        is_active: true
      }
    ]).select();

    if (tErr) throw tErr;
    console.log('Inserted tours:', tours.map(t => t.name).join(', '));

    // 3. Mevcut herhangi bir profili bulalım (vouchers için zorunlu)
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('id').limit(1);
    const adminId = profiles?.[0]?.id;
    if (!adminId) {
      console.log('No profiles found! Cannot insert vouchers without sales_person_id.');
      return;
    }

    // 4. Bilet (Voucher) Keselim
    console.log('Inserting dummy vouchers...');
    const vouchersToInsert = [
      {
        tour_id: tours[0].id,
        agency_id: agencyId,
        sales_person_id: adminId, 
        tour_date: new Date().toISOString().split('T')[0],
        customer_name: 'Deneme Müşteri 1',
        room_no: '101',
        pax_adult: 2,
        pax_child: 1,
        pax_infant: 0,
        currency: 'EUR',
        total_price: 150,
        deposit_paid: 50,
        agent_owes_easybook_eur: 125,
        status: 'active',
        voucher_no: 'SEED-' + Math.floor(Math.random() * 1000000)
      },
      {
        tour_id: tours[1].id,
        agency_id: agencyId,
        sales_person_id: adminId,
        tour_date: new Date().toISOString().split('T')[0],
        customer_name: 'Deneme Müşteri 2',
        pax_adult: 3,
        pax_child: 2,
        pax_infant: 1,
        currency: 'EUR',
        total_price: 200, 
        deposit_paid: 200,
        agent_owes_easybook_eur: 120,
        status: 'active',
        voucher_no: 'SEED-' + Math.floor(Math.random() * 1000000)
      }
    ];

    const { data: insertedVouchers, error: vErr } = await supabase.from('vouchers').insert(vouchersToInsert).select();
    
    if (vErr) throw vErr;
    console.log('Inserted vouchers successfully!');

  } catch (error) {
    console.error('Seed Error:', error);
  }
}

seedData();
