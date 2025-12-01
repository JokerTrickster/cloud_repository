/**
 * 2GB 파일 업로드 테스트 스크립트
 *
 * 실행 방법:
 * node scripts/test-large-upload.js
 */

const fs = require('fs');
const path = require('path');

// 테스트 파일 생성 (2GB)
function createLargeFile(filePath, sizeInGB) {
    console.log(`📝 Creating ${sizeInGB}GB test file...`);
    const sizeInBytes = sizeInGB * 1024 * 1024 * 1024;
    const chunkSize = 1024 * 1024; // 1MB chunks
    const totalChunks = sizeInBytes / chunkSize;

    const stream = fs.createWriteStream(filePath);
    const chunk = Buffer.alloc(chunkSize, 0);

    let written = 0;

    return new Promise((resolve, reject) => {
        function writeChunk() {
            let ok = true;
            while (written < totalChunks && ok) {
                written++;
                const progress = ((written / totalChunks) * 100).toFixed(2);

                if (written % 100 === 0) {
                    process.stdout.write(`\r📦 Progress: ${progress}% (${written}/${totalChunks} chunks)`);
                }

                if (written === totalChunks) {
                    stream.write(chunk, () => {
                        stream.end();
                        console.log('\n✅ File created successfully!');
                        resolve(filePath);
                    });
                } else {
                    ok = stream.write(chunk);
                }
            }

            if (written < totalChunks) {
                stream.once('drain', writeChunk);
            }
        }

        stream.on('error', reject);
        writeChunk();
    });
}

// 파일 크기 확인
function getFileSize(filePath) {
    const stats = fs.statSync(filePath);
    const sizeInGB = (stats.size / 1024 / 1024 / 1024).toFixed(2);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    return { bytes: stats.size, mb: sizeInMB, gb: sizeInGB };
}

// 파일 크기별 처리 로직 테스트
function testFileSizeLogic(fileSize) {
    const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB
    const isLargeFile = fileSize > LARGE_FILE_THRESHOLD;

    console.log('\n🔍 File Size Logic Test:');
    console.log(`   File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Threshold: ${(LARGE_FILE_THRESHOLD / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Is large file: ${isLargeFile ? '✅ YES' : '❌ NO'}`);

    if (isLargeFile) {
        console.log('   📋 Processing strategy:');
        console.log('      - Duration extraction: SKIP ⏭️');
        console.log('      - Thumbnail generation: SKIP ⏭️');
        console.log('      - Progress calculation: Upload only (0-100%) 📊');
    } else {
        console.log('   📋 Processing strategy:');
        console.log('      - Duration extraction: EXECUTE ✅');
        console.log('      - Thumbnail generation: EXECUTE ✅');
        console.log('      - Progress calculation: Upload (0-80%) + Thumbnail (80-100%) 📊');
    }

    return isLargeFile;
}

// 메인 실행
async function main() {
    console.log('🚀 Large File Upload Test\n');

    // 테스트 파일 경로
    const testDir = path.join(__dirname, '../test-files');
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }

    const testFilePath = path.join(testDir, 'test-2gb-video.mp4');

    // 기존 파일이 있는지 확인
    if (fs.existsSync(testFilePath)) {
        console.log('⚠️  Test file already exists. Checking size...');
        const size = getFileSize(testFilePath);
        console.log(`📊 Existing file size: ${size.gb} GB (${size.mb} MB)`);

        // 파일 크기 로직 테스트
        testFileSizeLogic(size.bytes);

        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            readline.question('\n❓ Recreate file? (y/n): ', (answer) => {
                readline.close();
                if (answer.toLowerCase() === 'y') {
                    fs.unlinkSync(testFilePath);
                    createLargeFile(testFilePath, 2).then(() => {
                        const size = getFileSize(testFilePath);
                        console.log(`\n✅ Final file size: ${size.gb} GB (${size.mb} MB)`);
                        testFileSizeLogic(size.bytes);
                        console.log(`\n📁 Test file location: ${testFilePath}`);
                        console.log('\n🎯 Next steps:');
                        console.log('   1. Start backend server: cd backend && npm run dev');
                        console.log('   2. Start frontend server: npm run dev');
                        console.log('   3. Navigate to http://localhost:5173');
                        console.log('   4. Upload the test file via UI');
                        resolve();
                    });
                } else {
                    console.log('\n✅ Using existing file');
                    console.log(`\n📁 Test file location: ${testFilePath}`);
                    console.log('\n🎯 Next steps:');
                    console.log('   1. Start backend server: cd backend && npm run dev');
                    console.log('   2. Start frontend server: npm run dev');
                    console.log('   3. Navigate to http://localhost:5173');
                    console.log('   4. Upload the test file via UI');
                    resolve();
                }
            });
        });
    } else {
        // 새 파일 생성
        await createLargeFile(testFilePath, 2);
        const size = getFileSize(testFilePath);
        console.log(`\n✅ Final file size: ${size.gb} GB (${size.mb} MB)`);
        testFileSizeLogic(size.bytes);
        console.log(`\n📁 Test file location: ${testFilePath}`);
        console.log('\n🎯 Next steps:');
        console.log('   1. Start backend server: cd backend && npm run dev');
        console.log('   2. Start frontend server: npm run dev');
        console.log('   3. Navigate to http://localhost:5173');
        console.log('   4. Upload the test file via UI');
    }
}

// 실행
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { createLargeFile, getFileSize, testFileSizeLogic };
