const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { put } = require('@vercel/blob');

async function storeImage(file) {
  const extension = path.extname(file.originalname).toLowerCase() || '.bin';
  const name = `uploads/${Date.now()}-${crypto.randomBytes(5).toString('hex')}${extension}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(name, file.buffer, { access: 'public', contentType: file.mimetype, addRandomSuffix: false });
    return blob.url;
  }
  if (process.env.VERCEL) throw new Error('BLOB_READ_WRITE_TOKEN is required for uploads on Vercel.');
  const localPath = path.join(__dirname, 'public', name);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, file.buffer);
  return `/${name}`;
}

module.exports = { storeImage };