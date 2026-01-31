import { useRef, useCallback } from 'react';

/**
 * Hook for PDF rendering operations
 * Handles canvas rendering, text layer, and annotations
 */
export const usePDFRenderer = (pdfDoc, pageScale) => {
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const annotationsRef = useRef(null);

  // Show clause details
  const showClauseDetails = (clauseMarker) => {
    alert(`Clause: ${clauseMarker.text}\n\n${clauseMarker.details || 'No details available.'}`);
  };

  // Show risk details
  const showRiskDetails = (riskBadge) => {
    alert(
      `Risk: ${riskBadge.description}\n\n${riskBadge.explanation || 'No explanation available.'}`
    );
  };

  // Render text layer for selection and searching
  const renderTextLayer = useCallback(async (page, viewport) => {
    if (!textLayerRef.current) return;

    // Clear previous text layer
    textLayerRef.current.innerHTML = '';

    try {
      const textContent = await page.getTextContent();
      const texts = textContent.items;
      const transform = viewport.transform;

      for (const item of texts) {
        const span = document.createElement('span');
        span.textContent = item.str;
        span.style.position = 'absolute';
        span.style.color = 'transparent';
        span.style.whiteSpace = 'pre';
        span.style.fontSize = `${item.height}px`;
        span.style.fontFamily = 'sans-serif';
        span.style.lineHeight = '1';

        // Apply transformation matrix
        const tx = transform[0] * item.transform[4] + transform[2] * item.transform[5] + transform[4];
        const ty = transform[1] * item.transform[4] + transform[3] * item.transform[5] + transform[5];

        span.style.left = `${tx}px`;
        span.style.top = `${ty}px`;
        span.style.width = `${item.width * transform[0]}px`;
        span.style.height = `${item.height * transform[3]}px`;

        textLayerRef.current.appendChild(span);
      }
    } catch (error) {
      console.error('Error rendering text layer:', error);
    }
  }, []);

  // Render annotations/highlights
  const renderAnnotations = useCallback((pageNum, viewport, highlights, clauseMarkers, riskBadges) => {
    if (!annotationsRef.current) return;

    // Clear previous annotations
    annotationsRef.current.innerHTML = '';

    // Render highlights for this page
    highlights
      .filter((h) => h.pageNum === pageNum)
      .forEach((highlight) => {
        const highlightEl = document.createElement('div');
        highlightEl.className = 'highlight-overlay';
        highlightEl.style.position = 'absolute';
        highlightEl.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
        highlightEl.style.border = '1px solid rgba(255, 255, 0, 0.5)';
        highlightEl.style.left = `${highlight.x}px`;
        highlightEl.style.top = `${highlight.y}px`;
        highlightEl.style.width = `${highlight.width}px`;
        highlightEl.style.height = `${highlight.height}px`;
        highlightEl.style.pointerEvents = 'none';
        highlightEl.dataset.page = pageNum;

        annotationsRef.current.appendChild(highlightEl);
      });

    // Render clause markers for this page
    clauseMarkers
      .filter((marker) => marker.pageNum === pageNum)
      .forEach((marker) => {
        const markerEl = document.createElement('div');
        markerEl.className = 'clause-marker';
        markerEl.style.position = 'absolute';
        markerEl.style.left = `${marker.x}px`;
        markerEl.style.top = `${marker.y}px`;
        markerEl.style.width = '20px';
        markerEl.style.height = '20px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = 'rgba(0, 123, 255, 0.7)';
        markerEl.style.cursor = 'pointer';
        markerEl.style.zIndex = '10';
        markerEl.title = marker.text;
        markerEl.onclick = () => showClauseDetails(marker);

        annotationsRef.current.appendChild(markerEl);
      });

    // Render risk badges for this page
    riskBadges
      .filter((badge) => badge.pageNum === pageNum)
      .forEach((badge) => {
        const badgeEl = document.createElement('div');
        badgeEl.className = 'risk-badge';
        badgeEl.style.position = 'absolute';
        badgeEl.style.left = `${badge.x}px`;
        badgeEl.style.top = `${badge.y}px`;
        badgeEl.style.padding = '2px 6px';
        badgeEl.style.borderRadius = '10px';
        badgeEl.style.fontSize = '12px';
        badgeEl.style.fontWeight = 'bold';
        badgeEl.style.color = 'white';
        badgeEl.style.backgroundColor =
          badge.level === 'high'
            ? '#dc3545'
            : badge.level === 'medium'
            ? '#fd7e14'
            : '#ffc107';
        badgeEl.style.cursor = 'pointer';
        badgeEl.style.zIndex = '10';
        badgeEl.title = badge.description;
        badgeEl.onclick = () => showRiskDetails(badge);

        badgeEl.textContent = badge.level.toUpperCase();

        annotationsRef.current.appendChild(badgeEl);
      });
  }, []);

  // Render a specific page with text layer and annotations
  const renderPage = useCallback(
    async (pageNum, highlights = [], clauseMarkers = [], riskBadges = []) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Calculate viewport
        const scale = pageScale;
        const viewport = page.getViewport({ scale });

        // Set canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Render PDF page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Render text layer for selection and searching
        await renderTextLayer(page, viewport);

        // Render annotations/highlights if any
        renderAnnotations(pageNum, viewport, highlights, clauseMarkers, riskBadges);
      } catch (error) {
        console.error('Error rendering page:', error);
      }
    },
    [pdfDoc, pageScale, renderTextLayer, renderAnnotations]
  );

  return {
    canvasRef,
    textLayerRef,
    annotationsRef,
    renderPage,
  };
};
