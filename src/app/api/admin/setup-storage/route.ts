import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('🪣 Setting up Supabase Storage for ticket attachments...')

    // Check if the bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return NextResponse.json({
        success: false,
        error: 'Failed to list storage buckets',
        details: listError.message
      }, { status: 500 })
    }

    console.log('📋 Existing buckets:', buckets?.map(b => b.name))

    const bucketName = 'ticket-attachments'
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName)

    if (bucketExists) {
      console.log('✅ Storage bucket already exists:', bucketName)
      
      // Test bucket access by attempting to list files
      const { data: files, error: listFilesError } = await supabase.storage
        .from(bucketName)
        .list('', { limit: 1 })

      if (listFilesError) {
        console.error('❌ Bucket exists but cannot access:', listFilesError)
        return NextResponse.json({
          success: false,
          error: 'Storage bucket exists but is not accessible',
          details: listFilesError.message,
          bucket_name: bucketName
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Storage bucket already exists and is accessible',
        bucket_name: bucketName,
        bucket_exists: true,
        access_test: 'passed'
      })
    }

    // Create the bucket
    console.log('🆕 Creating storage bucket:', bucketName)
    const { data: newBucket, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true // Allow public access to files
    })

    if (createError) {
      console.error('❌ Failed to create storage bucket:', createError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create storage bucket',
        details: createError.message,
        bucket_name: bucketName
      }, { status: 500 })
    }

    console.log('✅ Storage bucket created successfully:', bucketName)

    // Test the new bucket by uploading a small test file
    try {
      const testFileName = `test-${Date.now()}.txt`
      const testContent = 'Test file for bucket validation'
      
      const { data: testUpload, error: testUploadError } = await supabase.storage
        .from(bucketName)
        .upload(testFileName, testContent, {
          contentType: 'text/plain'
        })

      if (testUploadError) {
        console.error('❌ Test upload failed:', testUploadError)
        return NextResponse.json({
          success: false,
          error: 'Bucket created but test upload failed',
          details: testUploadError.message,
          bucket_name: bucketName
        }, { status: 500 })
      }

      // Clean up test file
      await supabase.storage.from(bucketName).remove([testFileName])

      console.log('✅ Bucket test upload successful')

      return NextResponse.json({
        success: true,
        message: 'Storage bucket created and tested successfully',
        bucket_name: bucketName,
        bucket_created: true,
        test_upload: 'passed'
      })

    } catch (testError: any) {
      console.error('❌ Bucket test failed:', testError)
      return NextResponse.json({
        success: false,
        error: 'Bucket created but testing failed',
        details: testError.message,
        bucket_name: bucketName
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('❌ Storage setup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Storage setup failed',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check storage bucket status
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to check storage status',
        details: listError.message
      }, { status: 500 })
    }

    const bucketName = 'ticket-attachments'
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName)

    if (!bucketExists) {
      return NextResponse.json({
        success: false,
        error: 'Storage bucket does not exist',
        bucket_name: bucketName,
        bucket_exists: false,
        setup_required: true,
        instructions: 'Run POST /api/admin/setup-storage to create the bucket'
      }, { status: 404 })
    }

    // Test bucket access
    const { data: files, error: listFilesError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1 })

    if (listFilesError) {
      return NextResponse.json({
        success: false,
        error: 'Storage bucket exists but is not accessible',
        details: listFilesError.message,
        bucket_name: bucketName,
        bucket_exists: true,
        access_test: 'failed'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Storage bucket is ready',
      bucket_name: bucketName,
      bucket_exists: true,
      access_test: 'passed',
      file_count: files?.length || 0
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Storage check failed',
      details: error.message
    }, { status: 500 })
  }
}
