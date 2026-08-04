'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, Maximize, Minimize, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
}

export default function PDFViewer({ url }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'width' | 'page' | 'custom'>('width');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  // Measure container for fit modes
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Update scale when fit mode or container size changes
  useEffect(() => {
    if (!containerWidth || !containerHeight) return;
    
    // We assume a standard PDF aspect ratio of ~1:1.414 (A4) if we don't know the exact page size
    // But react-pdf's Page component supports dynamic width/height.
    // If fitMode is 'width', we let Page handle it via width={containerWidth} prop.
    // If fitMode is 'page', we let Page handle it via height={containerHeight} prop.
  }, [containerWidth, containerHeight, fitMode]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = useCallback((offset: number) => {
    setPageNumber((prevPageNumber) => {
      const next = prevPageNumber + offset;
      return Math.min(Math.max(1, next), numPages);
    });
  }, [numPages]);

  const handleZoom = useCallback((delta: number) => {
    setFitMode('custom');
    setScale((prevScale) => Math.min(Math.max(0.5, prevScale + delta), 4.0));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only trigger if not typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    switch (e.key) {
      case 'ArrowLeft':
        changePage(-1);
        break;
      case 'ArrowRight':
        changePage(1);
        break;
      case '=':
      case '+':
        handleZoom(0.25);
        break;
      case '-':
        handleZoom(-0.25);
        break;
    }
  }, [changePage, handleZoom]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getPageProps = () => {
    if (fitMode === 'width' && containerWidth) {
      return { width: containerWidth - 32 }; // 32px padding
    } else if (fitMode === 'page' && containerHeight) {
      return { height: containerHeight - 32 };
    }
    return { scale };
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0908] rounded-xl border border-white/5 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#14120f]/80 backdrop-blur-md border-b border-white/5 shrink-0 z-10">
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
          <button 
            onClick={() => handleZoom(-0.25)} 
            className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-gray-400 min-w-[3rem] text-center">
            {fitMode === 'custom' ? `${Math.round(scale * 100)}%` : fitMode === 'width' ? 'Fit W' : 'Fit P'}
          </span>
          <button 
            onClick={() => handleZoom(0.25)} 
            className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
          <button 
            onClick={() => setFitMode('width')} 
            className={`p-1.5 rounded-md transition-colors ${fitMode === 'width' ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
            title="Fit to Width"
          >
            <Maximize className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setFitMode('page')} 
            className={`p-1.5 rounded-md transition-colors ${fitMode === 'page' ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
            title="Fit to Page"
          >
            <Minimize className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
          <button 
            onClick={() => changePage(-1)} 
            disabled={pageNumber <= 1}
            className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors disabled:opacity-30"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-gray-400 px-2">
            {numPages ? `${pageNumber} / ${numPages}` : '---'}
          </span>
          <button 
            onClick={() => changePage(1)} 
            disabled={pageNumber >= numPages}
            className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors disabled:opacity-30"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document View */}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-auto custom-scrollbar relative bg-[#0f0e0c] flex items-center justify-center p-4"
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Loading PDF...</span>
            </div>
          }
          error={
            <div className="text-red-400 text-sm p-4 bg-red-400/10 rounded-lg border border-red-400/20">
              Failed to load PDF document.
            </div>
          }
          className="flex flex-col items-center max-w-full"
        >
          <Page
            pageNumber={pageNumber}
            {...getPageProps()}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-2xl rounded-sm overflow-hidden"
            loading={
              <div className="flex items-center justify-center w-[400px] h-[600px] bg-white/5 rounded-sm animate-pulse"></div>
            }
          />
        </Document>
      </div>
    </div>
  );
}
