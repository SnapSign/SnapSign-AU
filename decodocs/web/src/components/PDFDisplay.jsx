import React from 'react';

/**
 * PDF display component with canvas, text layer, and annotations overlay
 */
const PDFDisplay = ({
  pdfDoc,
  isLoading,
  loadingMessage,
  canvasRef,
  textLayerRef,
  annotationsRef,
}) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center border border-dashed border-gray-300 rounded bg-gray-50 text-gray-600">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p>{loadingMessage || 'Loading PDF...'}</p>
        </div>
      </div>
    );
  }

  if (!pdfDoc) {
    return (
      <div className="flex-1 flex items-center justify-center border border-dashed border-gray-300 rounded bg-gray-50 text-gray-600">
        <p>No PDF selected. Click "Open PDF" to load a document.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 border border-gray-300 rounded overflow-hidden relative bg-gray-100 h-[calc(100vh-200px)] overflow-auto">
      <div className="relative mx-auto w-fit">
        <canvas
          ref={canvasRef}
          className="block max-w-full max-h-full bg-white shadow-lg"
        />
        {/* Text layer for selection and searching */}
        <div
          ref={textLayerRef}
          className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-0 leading-none"
        />
        {/* Annotations overlay */}
        <div
          ref={annotationsRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
      </div>
    </div>
  );
};

export default PDFDisplay;
