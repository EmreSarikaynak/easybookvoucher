// Simple migration script using fetch API
const supabaseUrl = 'https://yjxsnudpiknohrxxgyra.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqeHNudWRwaWtub2hyeHhneXJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYxODIyMSwiZXhwIjoyMDg1MTk0MjIxfQ.9VohZIrpHZfyjg8emr_SvamucpNMbWrsYQXaygZnHUg';

async function migrate() {
    console.log('Fetching agencies...');

    // Get all agencies ordered by created_at
    const response = await fetch(`${supabaseUrl}/rest/v1/agencies?select=id,name,created_at&order=created_at.asc`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });

    if (!response.ok) {
        console.error('Error fetching agencies:', await response.text());
        return;
    }

    const agencies = await response.json();
    console.log(`Found ${agencies.length} agencies`);

    // Update each agency with a code
    for (let i = 0; i < agencies.length; i++) {
        const code = '2026' + String(i + 1).padStart(3, '0');

        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/agencies?id=eq.${agencies[i].id}`, {
            method: 'PATCH',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ agency_code: code })
        });

        if (updateResponse.ok) {
            console.log(`✓ ${agencies[i].name} -> ${code}`);
        } else {
            console.error(`✗ Failed to update ${agencies[i].name}:`, await updateResponse.text());
        }
    }

    console.log('\nMigration completed!');
}

migrate();
