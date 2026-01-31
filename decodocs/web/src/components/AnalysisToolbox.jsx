import React from 'react';

/**
 * Analysis toolbox component with action buttons
 */
const AnalysisToolbox = ({
  onAnalyzeDocument,
  onExplainSelection,
  onHighlightRisks,
  onTranslateToPlainEnglish,
  isLoading,
  isAuthenticated,
  hasDocument,
}) => {
  const isDisabled = !hasDocument || !isAuthenticated || isLoading;

  return (
    <div className="w-[350px] p-5 bg-gray-50 border-l border-gray-300 flex flex-col overflow-y-auto">
      <h3 className="mt-0 text-gray-800 border-b border-gray-300 pb-2.5">
        Document Analysis Tools
      </h3>
      <div className="flex flex-col gap-2.5 mb-5">
        <button
          onClick={onAnalyzeDocument}
          disabled={isDisabled}
          className="w-full bg-gray-600 text-white px-4 py-2.5 text-sm rounded hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-left"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Document'}
        </button>
        <button
          onClick={onExplainSelection}
          disabled={isDisabled}
          className="w-full bg-gray-600 text-white px-4 py-2.5 text-sm rounded hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-left"
        >
          Explain Selection
        </button>
        <button
          onClick={onHighlightRisks}
          disabled={isDisabled}
          className="w-full bg-gray-600 text-white px-4 py-2.5 text-sm rounded hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-left"
        >
          Highlight Risks
        </button>
        <button
          onClick={onTranslateToPlainEnglish}
          disabled={isDisabled}
          className="w-full bg-gray-600 text-white px-4 py-2.5 text-sm rounded hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-left"
        >
          Translate to Plain English
        </button>
        <button
          disabled={isDisabled}
          className="w-full bg-gray-600 text-white px-4 py-2.5 text-sm rounded hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-left"
        >
          Summarize Key Points
        </button>
        <button
          disabled={isDisabled}
          className="w-full bg-gray-600 text-white px-4 py-2.5 text-sm rounded hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-left"
        >
          Suggest Improvements
        </button>
      </div>
    </div>
  );
};

export default AnalysisToolbox;
