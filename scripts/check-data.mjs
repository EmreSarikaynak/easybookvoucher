// Check sales person agency
const supabaseUrl = 'https://yjxsnudpiknohrxxgyra.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqeHNudWRwaWtub2hyeHhneXJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYxODIyMSwiZXhwIjoyMDg1MTk0MjIxfQ.9VohZIrpHZfyjg8emr_SvamucpNMbWrsYQXaygZnHUg';

async function check() {
    // Get a voucher to check its relationships
    const vRes = await fetch(`${supabaseUrl}/rest/v1/vouchers?select=id,voucher_no,sales_person_id,agency_id&limit=3`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const vouchers = await vRes.json();
    console.log('Sample vouchers:', vouchers);

    // Check profiles and their agency_id
    const pRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,full_name,agency_id&limit=10`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const profiles = await pRes.json();
    console.log('Profiles with agency_id:', profiles);

    // Check agencies with agency_code
    const aRes = await fetch(`${supabaseUrl}/rest/v1/agencies?select=id,name,agency_code`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const agencies = await aRes.json();
    console.log('Agencies with codes:', agencies);
}

check();
