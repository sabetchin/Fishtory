"use server"

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

interface CreateFishermanParams {
  email: string
  password?: string
  firstName: string
  lastName: string
  boatName?: string
  location?: string
  phoneNumber?: string
  totalBoatsOperated?: number
  totalCrew?: number
}

export async function createFishermanAccount(params: CreateFishermanParams) {
  try {
    // 1. Authenticate the caller (ensure it is a logged-in staff member)
    const userClient = await createServerClient()
    const { data: { user: staffUser }, error: staffUserError } = await userClient.auth.getUser()

    if (staffUserError || !staffUser) {
      return { success: false, error: "Unauthorized: You must be logged in to create fisherman accounts." }
    }

    // Double check that the user has the 'staff' role
    const staffRole = staffUser.user_metadata?.role
    if (staffRole !== 'staff') {
      return { success: false, error: `Access Denied: Only staff members can register new fisherman accounts. Your current role is: ${staffRole || 'none'}` }
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

    // 3. Generate the unique Fisherman ID
    const fishermanId = `FM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`

    // 4. Create the Auth User account via Supabase Admin Auth API
    // We assign a temporary password if one isn't provided
    const tempPassword = params.password || `FM${Math.random().toString(36).slice(-8)}`

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: params.email.trim(),
      password: tempPassword,
      email_confirm: true, // Auto-confirm since it's created by authorized staff
      user_metadata: {
        role: 'fisherman',
        first_name: params.firstName.trim(),
        last_name: params.lastName.trim(),
        full_name: `${params.firstName.trim()} ${params.lastName.trim()}`,
        fisherman_id: fishermanId
      }
    })

    if (authError) {
      return { success: false, error: `Supabase Auth Admin Error: ${authError.message}` }
    }

    const newUserId = authData.user?.id
    if (!newUserId) {
      return { success: false, error: "Auth account was created, but no User ID was returned." }
    }

    // 5. Create the database profile record in fisherman_registration
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('fisherman_registration')
      .insert({
        user_id: newUserId,
        fisherman_id: fishermanId,
        first_name: params.firstName.trim(),
        last_name: params.lastName.trim(),
        boat_name: params.boatName?.trim() || "",
        location: params.location?.trim() || "",
        phone_number: params.phoneNumber?.trim() || "",
        total_boats_operated: params.totalBoatsOperated || 1,
        total_crew: params.totalCrew || 1,
        created_by: staffUser.id
      })
      .select()
      .single()

    if (profileError) {
      // Rollback auth user creation if profile database insert fails, to prevent dangling auth records
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      return { success: false, error: `Database Error (Auth rolled back): ${profileError.message}` }
    }

    return {
      success: true,
      fishermanId,
      email: params.email.trim(),
      password: tempPassword,
      userId: newUserId,
      profile: profileData ? {
        id: profileData.id,
        fisherman_id: profileData.fisherman_id,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        boat_name: profileData.boat_name,
        location: profileData.location,
        phone_number: profileData.phone_number,
        total_boats_operated: profileData.total_boats_operated,
        total_crew: profileData.total_crew,
        user_id: profileData.user_id
      } : null
    }
  } catch (err: any) {
    return { success: false, error: err.message || "An unexpected error occurred during account creation." }
  }
}
