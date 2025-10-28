import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    // Verify admin role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const version = formData.get('version') as string
    const platform = formData.get('platform') as string
    const installerType = formData.get('installer_type') as string
    const changelog = formData.get('changelog') as string
    const isStable = formData.get('is_stable') === 'true'
    const forceUpdate = formData.get('force_update') === 'true'
    const architecture = (formData.get('architecture') as string) || 'x64'

    if (!file || !version || !platform) {
      return NextResponse.json({ error: 'Missing required fields: file, version, platform' }, { status: 400 })
    }

    // Validate platform
    const validPlatforms = ['windows', 'macos', 'linux']
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform. Must be: windows, macos, or linux' }, { status: 400 })
    }

    // Generate storage path
    const storagePath = `${platform}/${version}/${file.name}`

    // Calculate SHA256 hash
    const fileBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
    const sha256Hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('centcom-releases')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // Create version record
    const { data: versionData, error: versionError } = await supabase
      .from('application_versions')
      .insert({
        application_name: 'centcom',
        version_number: version,
        platform: platform,
        architecture: architecture,
        installer_type: installerType,
        file_size_bytes: file.size,
        sha256_hash: sha256Hash,
        storage_path: storagePath,
        release_date: new Date().toISOString(),
        is_stable: isStable,
        is_supported: true,
        auto_update_enabled: true,
        force_update: forceUpdate,
        changelog_url: changelog || null
      })
      .select()
      .single()

    if (versionError) {
      // Rollback: Delete uploaded file
      await supabase.storage.from('centcom-releases').remove([storagePath])
      return NextResponse.json({ error: `Version creation failed: ${versionError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      version: versionData,
      message: `Successfully uploaded ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
    })

  } catch (error: any) {
    console.error('Release upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
