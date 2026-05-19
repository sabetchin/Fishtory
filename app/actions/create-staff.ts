"use server"

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

interface CreateStaffParams {
  email: string
  password?: string
  fullName: string
  staffId: string
}

export async function createStaffAccount(params: CreateStaffParams) {
  try {
    // 1. Authenticate the caller (ensure it is a logged-in admin)
    const userClient = await createServerClient()
    const { data: { user: adminUser }, error: adminUserError } = await userClient.auth.getUser()

    if (adminUserError || !adminUser) {
      return { success: false, error: "Unauthorized: You must be logged in to create staff accounts." }
    }

    // Double check that the user has the 'admin' role
    const adminRole = adminUser.user_metadata?.role
    if (adminRole !== 'admin') {
      return { success: false, error: `Access Denied: Only admin members can register new staff accounts. Your current role is: ${adminRole || 'none'}` }
    }

    // 2. Initialize Supabase Admin Client using service_role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      return { success: false, error: "System Error: NEXT_PUBLIC_SUPABASE_URL is not configured." }
    }

    if (!serviceRoleKey) {
      return { 
        success: false, 
        error: "Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing on the server. " +
               "Please configure this environment variable in your .env.local file or Vercel dashboard to enable the Supabase Admin API."
      }
    }

    const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 3. Create the Auth User account via Supabase Admin Auth API
    const tempPassword = params.password || `ST${Math.random().toString(36).slice(-8)}`

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: params.email.trim(),
      password: tempPassword,
      email_confirm: true, // Auto-confirm since it's created by authorized admin
      user_metadata: {
        role: 'staff',
        staff_id: params.staffId.trim(),
        full_name: params.fullName.trim()
      }
    })

    if (authError) {
      return { success: false, error: `Supabase Auth Admin Error: ${authError.message}` }
    }

    const newUserId = authData.user?.id
    if (!newUserId) {
      return { success: false, error: "Auth account was created, but no User ID was returned." }
    }

    // 4. Create the database profile record in staff_profiles
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('staff_profiles')
      .insert({
        user_id: newUserId,
        staff_id: params.staffId.trim(),
        full_name: params.fullName.trim(),
        email: params.email.trim(),
        role: 'staff'
      })
      .select()
      .single()

    if (profileError) {
      // Rollback auth user creation if profile database insert fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      return { success: false, error: `Database Error (Auth rolled back): ${profileError.message}` }
    }

    return {
      success: true,
      staffId: params.staffId.trim(),
      email: params.email.trim(),
      password: tempPassword,
      userId: newUserId,
      profile: {
        id: profileData.id,
        user_id: profileData.user_id,
        staff_id: profileData.staff_id,
        full_name: profileData.full_name,
        email: profileData.email,
        role: profileData.role
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred during staff account creation." }
  }
}
