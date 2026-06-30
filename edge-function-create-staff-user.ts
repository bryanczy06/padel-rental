import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles').select('role, club_id').eq('id', user.id).single()

    if (!callerProfile || !['admin', 'owner', 'super_admin'].includes(callerProfile.role)) {
      throw new Error('Forbidden')
    }

    const { full_name, email, password, phone, role, club_id: requestedClubId } = await req.json()

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError) throw createError

    // super_admin and owner can specify a club_id; admin uses their own
    const clubId = ['super_admin', 'owner'].includes(callerProfile.role) && requestedClubId
      ? requestedClubId
      : callerProfile.club_id

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: newUser.user.id,
      club_id: clubId,
      full_name,
      email,
      phone: phone || null,
      role: role || 'staff',
    })
    if (profileError) throw profileError

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
