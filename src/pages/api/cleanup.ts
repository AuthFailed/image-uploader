import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // List all files in the 'images' bucket
        const { data: files, error: listError } = await supabase.storage
            .from('images')
            .list();

        if (listError) {
            throw listError;
        }

        // Filter and delete old files
        const oldFiles = files.filter(file => new Date(file.created_at) < oneDayAgo);

        for (const file of oldFiles) {
            const { error: deleteError } = await supabase.storage
                .from('images')
                .remove([file.name]);

            if (deleteError) {
                console.error(`Failed to delete file ${file.name}:`, deleteError);
            } else {
                console.log(`Deleted file: ${file.name}`);
            }
        }

        res.status(200).json({ message: `Cleanup completed. Deleted ${oldFiles.length} files.` });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: 'Internal server error during cleanup' });
    }
}