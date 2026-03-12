import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createUsers() {
    console.log('Creating users...\n')

    // Create Fisherman user
    const { data: fishermanData, error: fishermanError } = await supabase.auth.signUp({
        email: 'fm2026001@fishtory.com',
        password: '@FM2026',
        options: {
            data: {
                fisherman_id: 'FM-2026-001',
                role: 'fisherman',
                full_name: 'Fisherman User'
            }
        }
    })

    if (fishermanError) {
        console.error('❌ Error creating fisherman:', fishermanError.message)
    } else {
        console.log('✅ Fisherman created:', fishermanData.user?.email)
        console.log('   ID:', fishermanData.user?.id)
        console.log('   Fisherman ID: FM-2026-001')
    }

    // Create Admin user
    const { data: adminData, error: adminError } = await supabase.auth.signUp({
        email: 'admin01@fishtory.com',
        password: 'AD2026',
        options: {
            data: {
                staff_code: 'ADMIN01',
                role: 'admin',
                full_name: 'Admin User'
            }
        }
    })

    if (adminError) {
        console.error('\n❌ Error creating admin:', adminError.message)
    } else {
        console.log('\n✅ Admin created:', adminData.user?.email)
        console.log('   ID:', adminData.user?.id)
        console.log('   Staff Code: ADMIN01')
    }

    console.log('\n📝 User mapping:')
    console.log('   FM-2026-001 → fm2026001@fishtory.com (password: @FM2026)')
    console.log('   ADMIN01 → admin01@fishtory.com (password: AD2026)')
}

createUsers()
    .then(() => {
        console.log('\n✨ Done!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('💥 Fatal error:', error)
        process.exit(1)
    })
