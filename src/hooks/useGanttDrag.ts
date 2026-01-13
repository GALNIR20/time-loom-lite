import { useState, useCallback, useRef, useEffect } from 'react';

interface UseGanttDragProps {
  totalDays: number;
  onDaysChange: (id: string, days: number) => void;
}

interface DragState {
  isDragging: boolean;
  milestoneId: string | null;
  startX: number;
  startDays: number;
  containerWidth: number;
}

export function useGanttDrag({ totalDays, onDaysChange }: UseGanttDragProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    milestoneId: null,
    startX: 0,
    startDays: 0,
    containerWidth: 0,
  });
  
  const [previewDays, setPreviewDays] = useState<Record<string, number>>({});

  const handleDragStart = useCallback((
    e: React.MouseEvent | React.TouchEvent,
    milestoneId: string,
    currentDays: number,
    containerWidth: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    
    setDragState({
      isDragging: true,
      milestoneId,
      startX: clientX,
      startDays: currentDays,
      containerWidth,
    });
    
    setPreviewDays((prev) => ({ ...prev, [milestoneId]: currentDays }));
  }, []);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState.isDragging || !dragState.milestoneId) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - dragState.startX;
    
    // Calculate days change based on pixel movement
    const pixelsPerDay = dragState.containerWidth / totalDays;
    const daysDelta = Math.round(deltaX / pixelsPerDay);
    const newDays = Math.max(0, dragState.startDays + daysDelta);
    
    setPreviewDays((prev) => ({ ...prev, [dragState.milestoneId!]: newDays }));
  }, [dragState, totalDays]);

  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging || !dragState.milestoneId) return;
    
    const finalDays = previewDays[dragState.milestoneId];
    if (finalDays !== undefined && finalDays !== dragState.startDays) {
      onDaysChange(dragState.milestoneId, finalDays);
    }
    
    setDragState({
      isDragging: false,
      milestoneId: null,
      startX: 0,
      startDays: 0,
      containerWidth: 0,
    });
    
    setPreviewDays({});
  }, [dragState, previewDays, onDaysChange]);

  // Attach global event listeners for drag
  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

  const getPreviewDays = useCallback((milestoneId: string, actualDays: number): number => {
    return previewDays[milestoneId] ?? actualDays;
  }, [previewDays]);

  const isDraggingMilestone = useCallback((milestoneId: string): boolean => {
    return dragState.isDragging && dragState.milestoneId === milestoneId;
  }, [dragState]);

  return {
    handleDragStart,
    getPreviewDays,
    isDraggingMilestone,
    isDragging: dragState.isDragging,
  };
}
