import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminUser() {
  const email = 'admin@easybook.com';
  const password = 'AdminPassword123!';
  const fullName = 'EasyBook Admin';

  console.log(`🚀 Creating admin user: ${email}...`);

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('ℹ️ User already exists in Auth.');
      // Proceed to update profile just in case
    } else {
      console.error('❌ Error creating auth user:', authError.message);
      return;
    }
  }

  let finalUserId = authData?.user?.id;

  if (!finalUserId) {
     // If user already exists, we need to find their ID
     const { data: users, error: listError } = await supabase.auth.admin.listUsers();
     const existingUser = users?.users?.find(u => u.email === email);
     if (existingUser) {
       console.log('Found existing user ID:', existingUser.id);
       finalUserId = existingUser.id;
     } else {
       console.error('❌ Could not find user ID.');
       return;
     }
  }

  // 2. Create/Update profile in profiles table
  console.log(`🚀 Updating profile for user: ${finalUserId}...`);
  
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: finalUserId,
      email,
      full_name: fullName,
      role: 'admin',
      is_active: true,
    });

  if (profileError) {
    console.error('❌ Error updating profile:', profileError.message);
  } else {
    console.log('✅ Admin user and profile created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
  }
}

createAdminUser();
