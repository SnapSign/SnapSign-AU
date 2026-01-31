import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { loadPdf, renderPdfPage } from '../utils/pdfUtils';

// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist';
// Set the worker source using CDN for compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

const ViewDocument = () => {
  const { documentId } = useParams();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the component and get document info
  useEffect(() => {
    const initialize = async () => {
      // Get PDF URL from query parameter or construct from documentId
      const url = searchParams.get('url') || '';
      if (url) {
        setPdfUrl(url);
      } else if (documentId) {
        // In a real application, this would fetch the document URL from the backend
        // For now, we'll try to construct it based on our API pattern
        try {
          // Example: fetch document URL from API using documentId
          // const response = await fetch(`/api/documents/${documentId}/url`);
          // const data = await response.json();
          // setPdfUrl(data.url);
          console.log(`Document ID: ${documentId} - would fetch from API in real implementation`);
        } catch (err) {
          console.error('Error fetching document URL:', err);
        }
      }
      setIsInitialized(true);
    };

    initialize();
  }, [documentId, searchParams]);

  // Load PDF when URL is available and component is initialized
  useEffect(() => {
    if (!pdfUrl || !isInitialized) return;

    const loadPdfDocument = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use the utility function to load the PDF
        const pdf = await loadPdf(pdfUrl);
        setPdfDoc(pdf);
        setPageCount(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(`Failed to load PDF: ${err.message}. Please check the URL and try again.`);
        setLoading(false);
      }
    };

    loadPdfDocument();

    // Cleanup function to destroy PDF document when component unmounts
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [pdfUrl, isInitialized]);

  // Render current page when pdfDoc, pageNum, or scale changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderCurrentPage = async () => {
      try {
        // Use the utility function to render the page
        await renderPdfPage(pdfDoc, pageNum, canvasRef.current, scale);
      } catch (err) {
        console.error('Error rendering page:', err);
        setError(`Failed to render page: ${err.message}`);
      }
    };

    renderCurrentPage();
  }, [pdfDoc, pageNum, scale]);

  const handlePrevPage = () => {
    if (pageNum <= 1) return;
    setPageNum(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (pageNum >= pageCount) return;
    setPageNum(prev => prev + 1);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  // Handle page change via input
  const handlePageChange = (e) => {
    const newPage = parseInt(e.target.value, 10);
    if (newPage >= 1 && newPage <= pageCount) {
      setPageNum(newPage);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '100%', margin: '0 auto' }}>
      <h2>View Document</h2>
      
      {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading PDF document...</div>}
      
      {error && (
        <div style={{ 
          color: 'red', 
          padding: '10px', 
          border: '1px solid red', 
          borderRadius: '4px',
          marginBottom: '10px',
          backgroundColor: '#ffe6e6'
        }}>
          Error: {error}
        </div>
      )}
      
      {!loading && !error && pdfUrl && (
        <div>
          <div style={{ 
            marginBottom: '10px', 
            display: 'flex', 
            flexWrap: 'wrap',
            gap: '10px', 
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                onClick={handlePrevPage} 
                disabled={pageNum <= 1}
                style={{ 
                  padding: '5px 10px', 
                  cursor: pageNum <= 1 ? 'not-allowed' : 'pointer',
                  opacity: pageNum <= 1 ? 0.5 : 1
                }}
              >
                ← Prev
              </button>
              
              <span style={{ whiteSpace: 'nowrap' }}>
                Page 
                <input
                  type="number"
                  min="1"
                  max={pageCount}
                  value={pageNum}
                  onChange={handlePageChange}
                  style={{ 
                    width: '60px', 
                    textAlign: 'center', 
                    margin: '0 5px',
                    padding: '2px 5px'
                  }}
                /> 
                of {pageCount}
              </span>
              
              <button 
                onClick={handleNextPage} 
                disabled={pageNum >= pageCount}
                style={{ 
                  padding: '5px 10px', 
                  cursor: pageNum >= pageCount ? 'not-allowed' : 'pointer',
                  opacity: pageNum >= pageCount ? 0.5 : 1
                }}
              >
                Next →
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button onClick={handleZoomOut} title="Zoom Out">−</button>
              <button onClick={handleResetZoom} title="Reset Zoom" style={{ minWidth: '50px' }}>
                {Math.round(scale * 100)}%
              </button>
              <button onClick={handleZoomIn} title="Zoom In">+</button>
            </div>
          </div>
          
          <div style={{ 
            overflow: 'auto', 
            border: '1px solid #ddd', 
            height: '70vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            backgroundColor: 'white',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <canvas 
              ref={canvasRef} 
              style={{ 
                maxWidth: '100%',
                maxHeight: '100%',
                margin: '10px'
              }}
            />
          </div>
        </div>
      )}

      {!pdfUrl && !loading && isInitialized && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          border: '1px dashed #ccc'
        }}>
          <h3>No Document to View</h3>
          <p>Please provide a PDF URL using the ?url= parameter.</p>
          <p>Example: /view?url=https://example.com/document.pdf</p>
          {documentId && <p>Document ID: {documentId}</p>}
        </div>
      )}
    </div>
  );
};

export default ViewDocument;