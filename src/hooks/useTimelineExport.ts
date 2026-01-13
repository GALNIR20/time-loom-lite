import { useCallback, RefObject } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface ExportOptions {
  format: 'png' | 'pdf';
  filename?: string;
}

// WhatsApp/Teams optimized dimensions (16:9 aspect ratio, works well for previews)
const EXPORT_WIDTH = 1200;
const EXPORT_HEIGHT = 630;

export function useTimelineExport(contentRef: RefObject<HTMLElement | null>) {
  const exportTimeline = useCallback(async ({ format, filename = 'timeline' }: ExportOptions) => {
    if (!contentRef.current) {
      toast.error('Unable to capture timeline');
      return;
    }

    try {
      toast.loading('Generating export...', { id: 'export' });

      // Capture the element with high quality
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: contentRef.current.scrollWidth,
        height: contentRef.current.scrollHeight,
        windowWidth: contentRef.current.scrollWidth,
        windowHeight: contentRef.current.scrollHeight,
      });

      if (format === 'png') {
        // Create a resized canvas optimized for WhatsApp/Teams
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = EXPORT_WIDTH;
        resizedCanvas.height = EXPORT_HEIGHT;
        const ctx = resizedCanvas.getContext('2d');
        
        if (ctx) {
          // Fill with white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
          
          // Calculate scaling to fit while maintaining aspect ratio
          const sourceAspect = canvas.width / canvas.height;
          const targetAspect = EXPORT_WIDTH / EXPORT_HEIGHT;
          
          let drawWidth, drawHeight, offsetX, offsetY;
          
          if (sourceAspect > targetAspect) {
            // Source is wider, fit to width
            drawWidth = EXPORT_WIDTH;
            drawHeight = EXPORT_WIDTH / sourceAspect;
            offsetX = 0;
            offsetY = (EXPORT_HEIGHT - drawHeight) / 2;
          } else {
            // Source is taller, fit to height
            drawHeight = EXPORT_HEIGHT;
            drawWidth = EXPORT_HEIGHT * sourceAspect;
            offsetX = (EXPORT_WIDTH - drawWidth) / 2;
            offsetY = 0;
          }
          
          ctx.drawImage(canvas, offsetX, offsetY, drawWidth, drawHeight);
        }

        // Download PNG
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = resizedCanvas.toDataURL('image/png', 1.0);
        link.click();
        
        toast.success('PNG exported! Optimized for WhatsApp/Teams', { id: 'export' });
      } else {
        // PDF export - landscape A4 optimized for sharing
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        
        // Calculate dimensions to fit PDF page
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 2);
        
        const sourceAspect = canvas.width / canvas.height;
        const targetAspect = availableWidth / availableHeight;
        
        let imgWidth, imgHeight;
        
        if (sourceAspect > targetAspect) {
          imgWidth = availableWidth;
          imgHeight = availableWidth / sourceAspect;
        } else {
          imgHeight = availableHeight;
          imgWidth = availableHeight * sourceAspect;
        }
        
        const offsetX = margin + (availableWidth - imgWidth) / 2;
        const offsetY = margin + (availableHeight - imgHeight) / 2;

        pdf.addImage(
          canvas.toDataURL('image/png', 1.0),
          'PNG',
          offsetX,
          offsetY,
          imgWidth,
          imgHeight
        );

        pdf.save(`${filename}.pdf`);
        toast.success('PDF exported!', { id: 'export' });
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed. Please try again.', { id: 'export' });
    }
  }, [contentRef]);

  return { exportTimeline };
}
