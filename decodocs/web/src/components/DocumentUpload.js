import React, { useRef } from 'react';

const DocumentUpload = ({ onFilesSelected, selectedFiles, onSelectFile }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    onFilesSelected(files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    onFilesSelected(files);
  };

  return (
    <div className="document-upload-component">
      <div 
        className="upload-area" 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-icon">📄</div>
        <p>Click to select files or drag and drop</p>
        <p className="file-types">Supports: PDF, DOC, DOCX, TXT</p>
        <input 
          type="file" 
          ref={fileInputRef}
          accept=".pdf,.doc,.docx,.txt" 
          multiple 
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
      
      {selectedFiles.length > 0 && (
        <div className="documents-list">
          <h3>Your Documents ({selectedFiles.length})</h3>
          <div className="document-items">
            {selectedFiles.map((doc, index) => (
              <div 
                key={index} 
                className={`document-item ${false ? 'selected' : ''}`}
                onClick={() => onSelectFile(doc)}
              >
                <span className="document-name">{doc.name}</span>
                <span className="document-size">{(doc.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;