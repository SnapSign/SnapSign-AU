import React, { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getIdToken } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from './Layout.jsx';
import PDFControls from './PDFControls.jsx';
import PDFDisplay from './PDFDisplay.jsx';
import AnalysisToolbox from './AnalysisToolbox.jsx';
import AnalysisResults from './AnalysisResults.jsx';
import { usePDFRenderer } from '../hooks/usePDFRenderer.js';
import { computeSHA256, extractPdfText } from '../utils/pdfUtils.js';

// Use local worker from public folder to ensure stability in tests and offline
const pdfWorker = '/pdf.worker.min.mjs';

const DocumentViewer = () => {
  const { authState, app, auth } = useAuth();
  const isMockMode = typeof window !== 'undefined' && window.MOCK_AUTH;
  const [firebaseError, setFirebaseError] = useState(null);
  const [analysisResults, setAnalysisResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageScale, setPageScale] = useState(1.5);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [pdfTextContent, setPdfTextContent] = useState('');
  const [highlights, setHighlights] = useState([]);
  const [clauseMarkers, setClauseMarkers] = useState([]);
  const [riskBadges, setRiskBadges] = useState([]);
  const [docHash, setDocHash] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);
  const fileInputRef = useRef(null);
  const { documentId, fileName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize Firebase functions reference
  const functions = app ? getFunctions(app) : null;

  // Use PDF renderer hook
  const { canvasRef, textLayerRef, annotationsRef, renderPage: renderPageWithHook } = usePDFRenderer(
    pdfDoc,
    pageScale
  );

  // Check for Firebase errors and set appropriate state
  useEffect(() => {
    if (authState.status === 'error' && authState.error) {
      setFirebaseError(authState.error.message || 'Firebase authentication error');
    } else if (!app) {
      setFirebaseError('Firebase not initialized properly');
    }
  }, [authState, app]);

  // Function to check if Firebase functions are available
  const isFirebaseAvailable = () => {
    // In mock mode, if authenticated, allow operations to proceed
    if (isMockMode && authState.status === 'authenticated') {
      return true;
    }
    return app && functions && authState.status === 'authenticated';
  };

  // Initialize PDF.js worker
  useEffect(() => {
    const initPdfJs = async () => {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
      window.pdfjsLib = pdfjsLib;
      setPdfLibLoaded(true);

      // If fileName is provided in the route, load the test PDF
      if (fileName) {
        await loadTestPdf(fileName);
      }
    };

    initPdfJs();
  }, [fileName]);

  // Get document from location state
  useEffect(() => {
    if (location.state?.document && !fileName && pdfLibLoaded) {
      setSelectedDocument(location.state.document);
      loadPdfFromBlob(location.state.document.file);
    }
  }, [location, fileName, pdfLibLoaded]);

  // Render page when pageNumber or pageScale changes
  useEffect(() => {
    if (pdfDoc && pageNumber) {
      renderPageWithHook(pageNumber, highlights, clauseMarkers, riskBadges);
    }
  }, [pdfDoc, pageNumber, pageScale, highlights, clauseMarkers, riskBadges]);

  // Load PDF from Blob/File object
  const loadPdfFromBlob = async (fileBlob) => {
    if (!window.pdfjsLib || !fileBlob) return;

    try {
      setIsLoading(true);
      const fileNameForDisplay = fileBlob.name || 'document';
      setLoadingMessage(`Loading ${fileNameForDisplay}...`);

      const arrayBuffer = await fileBlob.arrayBuffer();
      console.log('PDF Buffer Size:', arrayBuffer.byteLength);
      console.log('Worker Src:', window.pdfjsLib.GlobalWorkerOptions.workerSrc);
      const docHashValue = await computeSHA256(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      setDocHash(docHashValue);

      const lib = window.pdfjsLib;
      const pdf = await lib.getDocument({
        data: arrayBuffer,
        onProgress: (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setLoadingMessage(`Loading ${fileNameForDisplay}: ${percent}%`);
        },
      }).promise;

      setPdfDoc(pdf);
      setNumPages(pdf.numPages);

      setLoadingMessage(`Extracting text from ${fileNameForDisplay}...`);
      const extractedText = await extractPdfText(pdf);
      setPdfTextContent(extractedText);

      setPageNumber(1);
      setLoadingMessage('');
    } catch (error) {
      console.error('Error loading PDF from blob:', error);
      console.error(error.stack);
      setLoadingMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  // Load test PDF from public folder
  const loadTestPdf = async (fileName) => {
    if (!window.pdfjsLib) return;

    try {
      setIsLoading(true);
      setLoadingMessage(`Loading ${fileName}...`);

      const pdfUrl = `/test-docs/${fileName}`;
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const docHashValue = await computeSHA256(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      setDocHash(docHashValue);

      const pdfjsLib = window.pdfjsLib;
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        onProgress: (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setLoadingMessage(`Loading ${fileName}: ${percent}%`);
        },
      }).promise;

      setPdfDoc(pdf);
      setNumPages(pdf.numPages);

      setSelectedDocument({
        id: fileName,
        name: fileName,
        size: arrayBuffer.byteLength,
        type: 'application/pdf',
        file: null,
      });

      setLoadingMessage(`Extracting text from ${fileName}...`);
      const extractedText = await extractPdfText(pdf);
      setPdfTextContent(extractedText);

      setPageNumber(1);
      setLoadingMessage('');
    } catch (error) {
      console.error('Error loading test PDF:', error);
      setLoadingMessage('');
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`Error loading test PDF: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Page navigation handlers
  const goToPreviousPage = () => {
    if (pageNumber <= 1) return;
    setPageNumber(pageNumber - 1);
  };

  const goToNextPage = () => {
    if (pageNumber >= numPages) return;
    setPageNumber(pageNumber + 1);
  };

  const zoomIn = () => {
    setPageScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setPageScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const pdfFiles = files.filter((file) => file.type === 'application/pdf');

    if (pdfFiles.length > 0) {
      const file = pdfFiles[0];
      const newDocument = {
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
      };

      setSelectedDocument(newDocument);
      navigate('/view', { state: { document: newDocument } });
    }
  };

  // Preflight check before analysis
  const runPreflightCheck = async () => {
    if (!pdfTextContent || !numPages) return { ok: true, classification: 'FREE_OK' };

    // In mock mode, return success immediately
    if (isMockMode) {
      return { ok: true, classification: 'FREE_OK' };
    }

    if (!functions) {
      console.error('Firebase functions not available. Returning default response.');
      return { ok: true, classification: 'FREE_OK' };
    }

    try {
      const pages = pdfTextContent.split('\f');
      const charsPerPage = pages.map((page) => page.length);
      const totalChars = pages.reduce((sum, page) => sum + page.length, 0);

      const preflightCheck = httpsCallable(functions, 'preflightCheck');
      const result = await preflightCheck({
        docHash,
        stats: {
          pageCount: numPages,
          charsPerPage,
          totalChars,
          pdfSizeBytes: selectedDocument?.size || 0,
        },
      });

      return result.data;
    } catch (error) {
      console.error('Preflight check error:', error);
      return { ok: true, classification: 'FREE_OK' };
    }
  };

  // Analyze document using extracted text
  const handleAnalyzeDocument = async () => {
    if (!selectedDocument || !pdfTextContent || !docHash) return;

    if (!isFirebaseAvailable()) {
      console.warn('Document analysis unavailable: Firebase services not accessible.');
      return;
    }

    setIsLoading(true);

    try {
      const preflightResult = await runPreflightCheck();

      if (!preflightResult.ok) {
        if (
          preflightResult.code === 'SCAN_DETECTED_PRO_REQUIRED' ||
          preflightResult.code === 'AI_BUDGET_EXCEEDED_PRO_REQUIRED'
        ) {
          alert(`This document requires deeper analysis, available on Pro. ${preflightResult.message}`);
          return;
        } else {
          console.error('Preflight check failed:', preflightResult);
          throw new Error(preflightResult.message || 'Preflight check failed');
        }
      }

      if (preflightResult.classification !== 'FREE_OK') {
        alert(
          `This document requires deeper analysis, available on Pro. ${preflightResult.reasons?.map((r) => r.message).join(', ') || ''}`
        );
        return;
      }

      const pages = pdfTextContent.split('\f');
      const charsPerPage = pages.map((page) => page.length);
      const totalChars = pages.reduce((sum, page) => sum + page.length, 0);

      let result;
      if (isMockMode) {
        // In mock mode, trigger a fetch that will be intercepted by Playwright
        const response = await fetch('/analyzeText', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docHash,
            stats: { pageCount: numPages, charsPerPage, totalChars, languageHint: 'en' },
            text: { format: 'paged', value: pdfTextContent },
            options: { tasks: ['explain', 'caveats', 'inconsistencies'], targetLanguage: null },
          }),
        });
        result = { data: await response.json() };
      } else {
        const analyzeText = httpsCallable(functions, 'analyzeText');
        result = await analyzeText({
        docHash,
        stats: {
          pageCount: numPages,
          charsPerPage,
          totalChars,
          languageHint: 'en',
        },
        text: {
          format: 'paged',
          value: pdfTextContent,
          pageTextIndex: pages.map((text, idx) => ({
            page: idx + 1,
            start: 0,
            end: text.length,
          })),
        },
          options: {
            tasks: ['explain', 'caveats', 'inconsistencies'],
            targetLanguage: null,
          },
        });
      }

      if (result.data.ok) {
        const mappedAnalysis = {
          summary: result.data.result.plainExplanation,
          keyPoints: [],
          risks: result.data.result.risks.map((risk) => ({
            id: risk.id,
            clause: risk.title,
            riskLevel: risk.severity,
            description: risk.whyItMatters,
            explanation: risk.whatToCheck.join('; '),
          })),
          recommendations: result.data.result.risks.flatMap((risk) => risk.whatToCheck || []),
        };

        setAnalysisResults((prev) => ({
          ...prev,
          [selectedDocument.id]: mappedAnalysis,
        }));

        updateAnnotationsFromAnalysis(mappedAnalysis);
      } else {
        if (
          result.data.code === 'SCAN_DETECTED_PRO_REQUIRED' ||
          result.data.code === 'AI_BUDGET_EXCEEDED_PRO_REQUIRED'
        ) {
          alert(`This document requires deeper analysis, available on Pro. ${result.data.message}`);
        } else {
          console.error('Analysis failed:', result.data);
          throw new Error(result.data.message || 'Analysis failed');
        }
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update annotations based on analysis results
  const updateAnnotationsFromAnalysis = (analysis) => {
    const newHighlights = [];
    const newClauseMarkers = [];
    const newRiskBadges = [];

    if (analysis.risks && analysis.risks.length > 0) {
      analysis.risks.forEach((risk, index) => {
        newRiskBadges.push({
          id: index,
          pageNum: 1,
          x: 100 + index * 50,
          y: 100 + index * 40,
          level: risk.riskLevel,
          description: risk.description,
          explanation: risk.explanation,
        });
      });
    }

    setHighlights(newHighlights);
    setClauseMarkers(newClauseMarkers);
    setRiskBadges(newRiskBadges);
  };

  const handleExplainSelection = async () => {
    if (!selectedDocument || !docHash) return;

    if (!isFirebaseAvailable()) {
      console.warn('Explain selection unavailable: Firebase services not accessible.');
      return;
    }

    const selection = 'Limitation of liability clause';

    try {
      let result;
      if (isMockMode) {
        const response = await fetch('/explainSelection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docHash, selection, documentContext: pdfTextContent }),
        });
        result = { data: await response.json() };
      } else {
        const explainSelection = httpsCallable(functions, 'explainSelection');
        result = await explainSelection({
          docHash,
          selection,
          documentContext: pdfTextContent,
        });
      }

      if (result.data.success) {
        alert(`Explanation: ${result.data.explanation.plainExplanation}`);
      } else {
        console.error('Explanation failed:', result.data);
        throw new Error(result.data.error || 'Explanation failed');
      }
    } catch (error) {
      console.error('Error explaining selection:', error);
      throw error;
    }
  };

  const handleHighlightRisks = async () => {
    if (!selectedDocument || !docHash) return;

    if (!isFirebaseAvailable()) {
      console.warn('Risk highlighting unavailable: Firebase services not accessible.');
      return;
    }

    setIsLoading(true);

    try {
      let result;
      if (isMockMode) {
        const response = await fetch('/highlightRisks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docHash, documentText: pdfTextContent, documentType: 'contract' }),
        });
        result = { data: await response.json() };
      } else {
        const highlightRisks = httpsCallable(functions, 'highlightRisks');
        result = await highlightRisks({
          docHash,
          documentText: pdfTextContent,
          documentType: 'contract',
        });
      }

      if (result.data.success) {
        alert(`Found ${result.data.risks.summary.totalRisks} risks in the document.`);

        const newRiskBadges =
          result.data.risks.items?.map((risk, idx) => ({
            id: idx,
            pageNum: 1,
            x: 150 + idx * 40,
            y: 150 + idx * 35,
            level: risk.riskLevel,
            description: risk.description,
            explanation: risk.explanation,
          })) || [];

        setRiskBadges(newRiskBadges);
      } else {
        console.error('Risk highlighting failed:', result.data);
        throw new Error(result.data.error || 'Risk highlighting failed');
      }
    } catch (error) {
      console.error('Error highlighting risks:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslateToPlainEnglish = async () => {
    if (!selectedDocument || !docHash) return;

    if (!isFirebaseAvailable()) {
      console.warn('Translation unavailable: Firebase services not accessible.');
      return;
    }

    try {
      const legalText = pdfTextContent.substring(0, 500);

      let result;
      if (isMockMode) {
        const response = await fetch('/translateToPlainEnglish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docHash, legalText }),
        });
        result = { data: await response.json() };
      } else {
        const translateToPlainEnglish = httpsCallable(functions, 'translateToPlainEnglish');
        result = await translateToPlainEnglish({
          docHash,
          legalText,
        });
      }

      if (result.data.success) {
        alert(
          `Original: ${result.data.translation.originalText}\n\nPlain English: ${result.data.translation.plainEnglishTranslation}`
        );
      } else {
        console.error('Translation failed:', result.data);
        throw new Error(result.data.error || 'Translation failed');
      }
    } catch (error) {
      console.error('Error translating to plain English:', error);
      throw error;
    }
  };

  const handleEditDocument = () => {
    if (selectedDocument) {
      navigate(`/edit/${selectedDocument.id}`, { state: { document: selectedDocument } });
    }
  };

  // Clean up resources
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [pdfDoc]);

  return (
    <Layout>
      <div className="flex flex-1 min-h-0 h-[calc(100vh-120px)]">
        {/* PDF Viewer Section */}
        <div className="flex-1 flex flex-col p-5 border-r border-gray-300 min-w-0">
          <PDFControls
            onFileSelect={handleFileUpload}
            onEdit={handleEditDocument}
            currentFileName={selectedDocument?.name}
            pageNumber={pageNumber}
            numPages={numPages}
            pageScale={pageScale}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            fileInputRef={fileInputRef}
          />

          <PDFDisplay
            pdfDoc={pdfDoc}
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            canvasRef={canvasRef}
            textLayerRef={textLayerRef}
            annotationsRef={annotationsRef}
          />
        </div>

        {/* Analysis Toolbox Section */}
        <div className="flex flex-col">
          <AnalysisToolbox
            onAnalyzeDocument={handleAnalyzeDocument}
            onExplainSelection={handleExplainSelection}
            onHighlightRisks={handleHighlightRisks}
            onTranslateToPlainEnglish={handleTranslateToPlainEnglish}
            isLoading={isLoading}
            isAuthenticated={authState.status === 'authenticated'}
            hasDocument={!!selectedDocument}
          />

          {analysisResults[selectedDocument?.id] && (
            <div className="w-[350px] p-5 bg-gray-50 border-l border-gray-300 overflow-y-auto">
              <AnalysisResults analysis={analysisResults[selectedDocument.id]} />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DocumentViewer;
