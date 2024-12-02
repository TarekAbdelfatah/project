import { TextItem } from '../types/TextItem';
import { findItem, isDescendant, getParentElement } from './itemUtils';

interface DragPosition {
  index: number;
  offsetY: number;
  targetId: string | null;
  isNested: boolean;
  isInvalid: boolean;
  level: number;
  isChildLevel: boolean;
}

export function handleDragStart(e: DragEvent, id: string) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', id);
    const element = e.target as HTMLElement;
    element.classList.add('dragging');
  }
}

export function calculateDropPosition(
  mouseY: number, 
  mouseX: number, 
  items: Element[], 
  draggedId: string,
  allItems: TextItem[]
): DragPosition {
  const NESTING_THRESHOLD = 40;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rect = item.getBoundingClientRect();
    const targetId = item.getAttribute('data-id');
    const currentLevel = parseInt(item.getAttribute('data-level') || '0', 10);
    
    if (mouseY >= rect.top && mouseY <= rect.bottom) {
      const relativeX = mouseX - rect.left;
      const relativeY = mouseY - rect.top;
      const isInUpperHalf = relativeY < rect.height / 2;
      const levelDiff = Math.floor(relativeX / NESTING_THRESHOLD);
      
      // Prevent invalid moves
      if (targetId && isDescendant(draggedId, targetId, allItems)) {
        return { 
          index: i,
          offsetY: rect.top,
          targetId: null,
          isNested: false,
          isInvalid: true,
          level: currentLevel,
          isChildLevel: false
        };
      }

      // Calculate target level based on position and context
      let targetLevel = currentLevel;
      if (levelDiff > 0) {
        const prevItem = items[i - 1];
        if (prevItem) {
          const prevLevel = parseInt(prevItem.getAttribute('data-level') || '0', 10);
          targetLevel = Math.min(prevLevel + 1, levelDiff);
        }
      }

      // If we're in the upper half of an item
      if (isInUpperHalf) {
        const prevItem = items[i - 1];
        const prevLevel = prevItem ? parseInt(prevItem.getAttribute('data-level') || '0', 10) : 0;
        
        return {
          index: i,
          offsetY: rect.top,
          targetId: getParentElement(item)?.getAttribute('data-id') || null,
          isNested: false,
          isInvalid: false,
          level: Math.min(prevLevel, targetLevel),
          isChildLevel: currentLevel > 0
        };
      }
      
      // If we're in the lower half
      const isNested = levelDiff > 0 && targetLevel > currentLevel;
      return {
        index: i + 1,
        offsetY: rect.bottom,
        targetId: isNested ? targetId : getParentElement(item)?.getAttribute('data-id') || null,
        isNested,
        isInvalid: false,
        level: isNested ? currentLevel + 1 : targetLevel,
        isChildLevel: isNested || currentLevel > 0
      };
    }
  }
  
  // Handle case when dragging to empty area or end of list
  if (items.length > 0) {
    const lastItem = items[items.length - 1];
    const rect = lastItem.getBoundingClientRect();
    const currentLevel = parseInt(lastItem.getAttribute('data-level') || '0', 10);
    return { 
      index: items.length,
      offsetY: rect.bottom,
      targetId: null,
      isNested: false,
      isInvalid: false,
      level: currentLevel,
      isChildLevel: currentLevel > 0
    };
  }
  
  return { 
    index: 0,
    offsetY: 0,
    targetId: null,
    isNested: false,
    isInvalid: false,
    level: 0,
    isChildLevel: false
  };
}

export function handleDragOver(e: DragEvent, draggedId: string, allItems: TextItem[]) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }

  const draggableArea = (e.currentTarget as HTMLElement);
  const items = Array.from(draggableArea.querySelectorAll('.draggable-item:not(.dragging)'));
  const indicator = draggableArea.querySelector('.drop-indicator') as HTMLElement;
  
  if (!indicator || items.length === 0) {
    if (indicator) indicator.style.display = 'none';
    return;
  }

  const { offsetY, isNested, isInvalid, level } = calculateDropPosition(
    e.clientY,
    e.clientX,
    items,
    draggedId,
    allItems
  );
  
  const areaRect = draggableArea.getBoundingClientRect();
  
  if (isInvalid) {
    indicator.style.display = 'none';
    return;
  }
  
  indicator.style.display = 'block';
  indicator.classList.add('visible');
  
  // Remove all level classes first
  indicator.classList.remove('level-0', 'level-1', 'level-2', 'level-3', 'level-4');
  // Add the appropriate level class
  const finalLevel = Math.min(level, 4);
  indicator.classList.add(`level-${finalLevel}`);
  
  // Set the level number in the indicator
  indicator.setAttribute('data-level', (finalLevel + 1).toString());
  
  indicator.style.top = `${offsetY - areaRect.top}px`;
  indicator.style.left = `${level * 20}px`;
  indicator.style.width = `calc(100% - ${level * 20}px)`;
}

export function handleDragEnd(e: DragEvent) {
  const element = e.target as HTMLElement;
  element.classList.remove('dragging');
  
  const indicator = document.querySelector('.drop-indicator');
  if (indicator) {
    indicator.classList.remove('visible');
    indicator.classList.remove('level-0', 'level-1', 'level-2', 'level-3', 'level-4');
    (indicator as HTMLElement).style.display = 'none';
  }
}

export function getDropPosition(
  e: DragEvent,
  draggableArea: HTMLElement,
  draggedId: string,
  allItems: TextItem[]
): DragPosition {
  const items = Array.from(draggableArea.querySelectorAll('.draggable-item:not(.dragging)'));
  return calculateDropPosition(e.clientY, e.clientX, items, draggedId, allItems);
}