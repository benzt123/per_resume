// extractor.js
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const mammoth = require('mammoth');
const { createWorker } = require('tesseract.js');
const fs = require('fs');
const path = require('path');

// 禁用不需要的 PDF.js 功能来避免 canvas 依赖
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

async function extractText(filePath, filename) {
  try {
    const ext = path.extname(filename).toLowerCase();
    console.log(`处理文件: ${filename}, 扩展名: ${ext}`);

    if (ext === '.txt') {
      const content = fs.readFileSync(filePath, 'utf8');
      console.log('TXT文件读取完成，文本长度:', content.length);
      return content;

    } else if (ext === '.pdf') {
      console.log('开始解析PDF文件...');
      const text = await extractTextFromPDF(filePath);
      console.log('PDF解析完成，文本长度:', text.length);
      return text;

    } else if (ext === '.docx' || ext === '.doc') {
      console.log('开始解析Word文档...');
      const text = await extractTextFromDocx(filePath);
      console.log('Word文档解析完成，文本长度:', text.length);
      return text;

    } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      console.log('开始OCR识别图片...');
      const text = await extractTextFromImage(filePath);
      console.log('OCR识别完成，文本长度:', text.length);
      return text;
    }

    throw new Error(`不支持的文件类型: ${ext}`);
  } catch (error) {
    console.error('文件提取失败:', error);
    throw new Error(`文件处理失败: ${error.message}`);
  }
}

// 使用 PDF.js 解析 PDF（纯文本模式）
async function extractTextFromPDF(filePath) {
  try {
    const data = new Uint8Array(fs.readFileSync(filePath));
    
    // 禁用渲染，只提取文本
    const loadingTask = pdfjsLib.getDocument({
      data: data,
      disableFontFace: true,
      disableStream: true,
      disableAutoFetch: true,
      isEvalSupported: false
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    console.log(`PDF 总页数: ${pdf.numPages}`);
    
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`正在解析第 ${i} 页...`);
      const page = await pdf.getPage(i);
      
      // 只提取文本内容，不渲染
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
      
      // 释放页面资源
      page.cleanup();
    }
    
    // 释放文档资源
    loadingTask.destroy();
    
    return fullText;
  } catch (error) {
    console.error('PDF解析失败:', error);
    throw new Error(`PDF解析失败: ${error.message}`);
  }
}

// 使用 mammoth 解析 DOCX
async function extractTextFromDocx(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('DOCX解析失败:', error);
    throw new Error(`DOCX解析失败: ${error.message}`);
  }
}

// 使用 Tesseract 解析图片
async function extractTextFromImage(filePath) {
  try {
    const worker = await createWorker('chi_sim');
    const ret = await worker.recognize(filePath);
    await worker.terminate();
    return ret.data.text;
  } catch (error) {
    console.error('OCR识别失败:', error);
    throw new Error(`图片识别失败: ${error.message}`);
  }
}

module.exports = { extractText };