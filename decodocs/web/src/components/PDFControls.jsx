import React from 'react';

/**
 * PDF viewer controls component
 * Handles file selection, navigation, and zoom controls
 */
const PDFControls = ({
  onFileSelect,
  onEdit,
  currentFileName,
  pageNumber,
  numPages,
  pageScale,
  onPreviousPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  fileInputRef,
}) => {
  return (
    <div className="flex gap-4 mb-4 items-center flex-wrap">
      <button
        onClick={() => fileInputRef.current?.click()}
        className="bg-blue-500 text-white px-4 py-2 text-sm rounded hover:bg-blue-600 transition-colors"
      >
        Open Different PDF
      </button>
      <button
        onClick={onEdit}
        className="bg-green-600 text-white px-4 py-2 text-sm rounded hover:bg-green-700 transition-colors"
      >
        Edit & Sign
      </button>
      {currentFileName && (
        <span className="text-sm text-gray-600 flex-1 text-left break-all">
          Current: {currentFileName}
        </span>
      )}
      <div className="flex gap-2 items-center">
        <button
          onClick={onPreviousPage}
          disabled={pageNumber <= 1}
          className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          ‹ Prev
        </button>
        <span className="text-sm text-gray-700">
          Page {pageNumber} of {numPages || 0}
        </span>
        <button
          onClick={onNextPage}
          disabled={pageNumber >= numPages}
          className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          Next ›
        </button>
      </div>
      <div className="flex gap-2 items-center">
        <button
          onClick={onZoomOut}
          className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
        >
          Zoom Out
        </button>
        <span className="text-sm text-gray-700 min-w-[60px] text-center">
          {Math.round(pageScale * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
        >
          Zoom In
        </button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        onChange={onFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default PDFControls;
