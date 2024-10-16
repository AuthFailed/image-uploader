// src/pages/api/upload.js
import { writeFile } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

export async function POST({ request }) {
    try {
        const formData = await request.formData();
        const file = formData.get('image');

        if (!file) {
            return new Response(JSON.stringify({ error: 'Файл не загружен' }), { status: 400 });
        }

        // Убедимся, что файл является изображением
        if (!file.type.startsWith('image/')) {
            return new Response(JSON.stringify({ error: 'Файл не является изображением' }), { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const filename = generateRandomFilename(file.name);
        const filepath = join(process.cwd(), 'public', 'pictures', filename);

        await writeFile(filepath, Buffer.from(buffer));
        return new Response(JSON.stringify({ filename }), { status: 200 });
    } catch (error) {
        console.error('Ошибка обработки загрузки:', error);
        return new Response(JSON.stringify({ error: 'Ошибка обработки загрузки' }), { status: 500 });
    }
}

function generateRandomFilename(originalFilename) {
    const fileExtension = originalFilename.split('.').pop();
    const randomName = crypto.randomBytes(16).toString('hex');
    return `${randomName}.${fileExtension}`;
}