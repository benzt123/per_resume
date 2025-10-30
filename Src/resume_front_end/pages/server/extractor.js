// server/extractor.js
const pdf = require('pdf-parse');
const { extractTextFromDocx } = require('docx-parser');
const { createWorker } = require('tesseract.js');
const fs = require('fs');

async function extractText(filePath, filename) {
  const ext = filename.toLowerCase();

  if (ext.endsWith('.txt')) {
    return fs.readFileSync(filePath, 'utf8');

  } else if (ext.endsWith('.pdf')) {
    const data = await pdf(fs.readFileSync(filePath));
    return data.text;

  } else if (ext.endsWith('.docx')) {
    const buffer = fs.readFileSync(filePath);
    const result = await extractTextFromDocx(buffer);
    return result.text;

  } else if (ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
    const worker = await createWorker('chi_sim'); // 支持中文
    const ret = await worker.recognize(filePath);
    await worker.terminate();
    return ret.data.text;
  }

  throw new Error('不支持的文件类型');
}

module.exports = { extractText };