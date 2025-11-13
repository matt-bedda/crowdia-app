const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey.substring(0, 20) + '...\n');

  try {
    // Test 1: Check if we can connect
    console.log('✓ Testing basic connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('_supabase_health_check')
      .select('*')
      .limit(1);

    // Test 2: Check for our tables
    console.log('✓ Checking for database tables...\n');

    const tables = [
      'users',
      'organizers',
      'categories',
      'events',
      'event_interests',
      'event_check_ins',
      'badges',
      'user_badges',
      'waiting_list'
    ];

    const results = {};

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          results[table] = '❌ Not found or no access';
        } else {
          results[table] = '✅ Exists';
        }
      } catch (err) {
        results[table] = '❌ Error: ' + err.message;
      }
    }

    console.log('📊 Table Status:');
    console.log('─'.repeat(50));
    Object.entries(results).forEach(([table, status]) => {
      console.log(`${table.padEnd(20)} ${status}`);
    });
    console.log('─'.repeat(50));

    // Check if all tables exist
    const allTablesExist = Object.values(results).every(status => status.includes('✅'));

    if (allTablesExist) {
      console.log('\n✅ SUCCESS: All tables exist! Migration has been applied.\n');

      // Check categories to see if seed data exists
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*');

      if (categories && categories.length > 0) {
        console.log(`✅ Found ${categories.length} categories (seed data loaded)`);
        console.log('Categories:', categories.map(c => c.name).join(', '));
      } else {
        console.log('⚠️  No categories found - seed data may not be loaded');
      }
    } else {
      console.log('\n❌ MIGRATION NEEDED: Some tables are missing.\n');
      console.log('📝 Next steps:');
      console.log('1. Go to: https://supabase.com/dashboard/project/mqcufztknioapxuzsevn/editor/sql');
      console.log('2. Copy the contents of: supabase/migrations/20250101000000_initial_schema.sql');
      console.log('3. Paste and execute in the SQL editor\n');
    }

  } catch (error) {
    console.error('\n❌ Connection Error:', error.message);
    console.error('\nPlease check:');
    console.error('- Your internet connection');
    console.error('- The Supabase URL and key are correct');
    console.error('- The Supabase project is active');
    process.exit(1);
  }
}

testConnection();
