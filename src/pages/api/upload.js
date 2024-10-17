import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

let supabase
try {
    const supabaseUrl = import.meta.env.SUPABASE_URL
    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('Supabase URL or Anon Key is missing from environment variables')
    }

    supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
} catch (error) {
    console.error('Error initializing Supabase client:', error)
}

const MAX_STORAGE = 1024 * 1024 * 1024 // 1 GB in bytes

export async function POST({ request }) {
    if (!supabase) {
        return new Response(JSON.stringify({ error: 'Supabase client not initialized' }), { status: 500 })
    }

    try {
        const formData = await request.formData()
        const file = formData.get('image')

        if (!file) {
            return new Response(JSON.stringify({ error: 'Файл не загружен' }), { status: 400 })
        }

        if (!file.type.startsWith('image/')) {
            return new Response(JSON.stringify({ error: 'Прикрепленный файл - не картинка' }), { status: 400 })
        }

        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
        if (file.size > MAX_FILE_SIZE) {
            return new Response(JSON.stringify({ error: 'Размер файла превышает 50мбит' }), { status: 400 })
        }

        // Check current storage usage
        const { data: storageData, error: storageError } = await supabase
            .storage
            .getBucket('images')

        if (storageError) {
            console.error('Error fetching storage data:', storageError)
            return new Response(JSON.stringify({ error: 'Error checking storage' }), { status: 500 })
        }

        const currentUsage = storageData.size
        const fileSize = file.size

        // If adding this file would exceed the limit, delete old files
        if (currentUsage + fileSize > MAX_STORAGE) {
            await deleteOldFiles(currentUsage + fileSize - MAX_STORAGE)
        }

        // Generate a unique filename
        const fileExtension = file.name.split('.').pop()
        const randomName = crypto.randomBytes(16).toString('hex')
        const filename = `${randomName}.${fileExtension}`

        // Upload file to Supabase
        const { data, error } = await supabase
            .storage
            .from('images')
            .upload(filename, file)

        if (error) {
            console.error('Error uploading file:', error)
            return new Response(JSON.stringify({ error: 'Error uploading file' }), { status: 500 })
        }

        const customUrl = `https://img.chrsnv.ru/pictures/${filename}`;
        return new Response(JSON.stringify({
            url: customUrl
        }), { status: 200 })

    } catch (error) {
        console.error('Error processing upload:', error)
        return new Response(JSON.stringify({ error: 'Error processing upload' }), { status: 500 })
    }
}

async function deleteOldFiles(spaceToFree) {
    let freedSpace = 0
    let { data: files, error } = await supabase
        .storage
        .from('images')
        .list()

    if (error) {
        console.error('Error listing files:', error)
        return
    }

    // Sort files by creation time, oldest first
    files.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    for (const file of files) {
        if (freedSpace >= spaceToFree) break

        const { data, error } = await supabase
            .storage
            .from('images')
            .remove([file.name])

        if (error) {
            console.error('Error deleting file:', error)
        } else {
            freedSpace += file.metadata.size
        }
    }
}