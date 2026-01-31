// utils/pdfUtils.js
import * as pdfjsLib from 'pdfjs-dist';

// Self-hosted worker for reliability and performance
// Make sure pdf.worker.min.js from pdfjs-dist is present in your public/ directory
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

/**
 * Loads a PDF document from a URL
 * @param {string} url - The URL of the PDF document
 * @returns {Promise<Object>} The loaded PDF document
 */
export const loadPdf = async (url) => {
  try {
    const loadingTask = pdfjsLib.getDocument({
      url: url,
      withCredentials: false,
    });
    const pdf = await loadingTask.promise;
    return pdf;
  } catch (error) {
    console.error('Error loading PDF:', error);
    throw error;
  }
};

/**
 * Renders a specific page of a PDF to a canvas
 * @param {Object} pdf - The loaded PDF document
 * @param {number} pageNumber - The page number to render (1-indexed)
 * @param {HTMLCanvasElement} canvas - The canvas element to render to
 * @param {number} scale - Scale factor for rendering
 * @returns {Promise<Object>} Object containing page information
 */
export const renderPdfPage = async (pdf, pageNumber, canvas, scale = 1.0) => {
  try {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    const renderTask = page.render(renderContext);
    await renderTask.promise;
    return {
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      rotation: viewport.rotation,
      scale
    };
  } catch (error) {
    console.error('Error rendering PDF page:', error);
    throw error;
  }
};

/**
 * Extracts text content from all pages of a PDF document
 * @param {Object} pdf - The loaded PDF document
 * @returns {Promise<string>} The extracted text with page separators
 */
export const extractPdfTextAllPages = async (pdf) => {
  try {
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      fullText += pageText + '\f';
    }
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return 'PDF text content';
  }
};

/**
 * Extracts text content from a specific PDF page
 * @param {Object} pdf - The loaded PDF document
 * @param {number} pageNumber - The page number to extract text from
 * @returns {Promise<string>} The extracted text
 */
export const extractPdfText = async (pdf, pageNumber) => {
  try {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    return textContent.items.map((item) => item.str).join(' ');
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
};

/** Utility function to compute SHA-256 hash */
export const computeSHA256 = async (data) => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

/** Detect if a PDF is likely scanned (few chars per page) */
export const detectScannedDocument = (textContent, numPages) => {
  if (!textContent || numPages === 0) return 0;
  const MIN_CHARS_PER_PAGE = 50; // Threshold for scanned detection
  const pages = textContent.split('\f');
  let pagesWithLowText = 0;
  for (let i = 0; i < Math.min(pages.length, numPages); i++) {
    const pageText = pages[i] || '';
    if (pageText.trim().length < MIN_CHARS_PER_PAGE) {
      pagesWithLowText++;
    }
  }
  return pagesWithLowText / numPages;
};
