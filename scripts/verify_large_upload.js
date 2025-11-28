import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://13.203.37.93:18080/api/v1';
const TOKEN = process.env.ACCESS_TOKEN;

if (!TOKEN) {
    console.error('Error: ACCESS_TOKEN environment variable is required.');
    console.error('Usage: ACCESS_TOKEN=... node scripts/verify_large_upload.js');
    process.exit(1);
}

const FILE_SIZE_MB = 105;
const FILE_PATH = path.join(__dirname, 'temp_large_file.bin');

async function createLargeFile() {
    console.log(`Creating ${FILE_SIZE_MB}MB dummy file...`);
    const stream = fs.createWriteStream(FILE_PATH);
    const chunk = Buffer.alloc(1024 * 1024, 'a'); // 1MB chunk

    for (let i = 0; i < FILE_SIZE_MB; i++) {
        if (!stream.write(chunk)) {
            await new Promise(resolve => stream.once('drain', resolve));
        }
    }
    stream.end();
    await new Promise(resolve => stream.on('finish', resolve));
    console.log('File created.');
}

async function uploadFile() {
    try {
        const stats = fs.statSync(FILE_PATH);
        const fileName = 'large_test_file.bin';
        const fileType = 'video/mp4'; // Pretend to be a video to allow large size if images are restricted

        console.log('Requesting upload URL...');
        const payload = {
            files: [{
                file_name: fileName,
                content_type: fileType,
                file_type: 'video',
                file_size: stats.size
            }]
        };

        const res = await axios.post(`${API_URL}/files/upload/batch`, payload, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const result = res.data.results[0];
        if (!result || !result.upload_url) {
            throw new Error('No upload URL returned');
        }

        console.log('Upload URL received. Uploading to S3...');

        const fileStream = fs.createReadStream(FILE_PATH);

        await axios.put(result.upload_url, fileStream, {
            headers: {
                'Content-Type': fileType
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            onUploadProgress: (progressEvent) => {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                process.stdout.write(`\rUploading: ${percent}%`);
            }
        });

        console.log('\nUpload completed successfully!');
        console.log(`File ID: ${result.file_id}`);

    } catch (error) {
        console.error('\nUpload failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    } finally {
        // Cleanup
        if (fs.existsSync(FILE_PATH)) {
            fs.unlinkSync(FILE_PATH);
            console.log('Temp file cleaned up.');
        }
    }
}

async function main() {
    await createLargeFile();
    await uploadFile();
}

main();
