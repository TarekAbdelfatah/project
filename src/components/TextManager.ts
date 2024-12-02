import { TextItem } from '../types/TextItem';
import { handleDragStart, handleDragOver, handleDragEnd, getDropPosition } from '../utils/dragUtils';
import { 
  findItem, 
  removeItemFromTree, 
  updateItemOrders, 
  findParentAtLevel,
  isDescendant,
  getSiblingItems
} from '../utils/itemUtils';

export class TextManager {
  private items: TextItem[] = [];
  private container: HTMLElement;
  private input: HTMLInputElement;
  private draggableArea: HTMLElement;
  private currentDragId: string | null = null;

  constructor(containerId: string) {
    this.container = document.createElement('div');
    this.container.className = 'text-manager';
    
    this.setupInput();
    this.setupDraggableArea();
    
    const mount = document.getElementById(containerId);
    if (mount) mount.appendChild(this.container);
  }

  private setupInput() {
    const inputSection = document.createElement('div');
    inputSection.className = 'input-section';
    
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Enter text and press Enter to add...';
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addItem();
      }
    });
    
    inputSection.appendChild(this.input);
    this.container.appendChild(inputSection);
  }

  private setupDraggableArea() {
    this.draggableArea = document.createElement('div');
    this.draggableArea.className = 'draggable-area';
    
    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator';
    this.draggableArea.appendChild(indicator);
    
    this.draggableArea.addEventListener('dragover', (e) => {
      if (this.currentDragId) {
        handleDragOver(e, this.currentDragId, this.items);
      }
    });
    this.draggableArea.addEventListener('drop', (e) => this.handleDrop(e));
    
    this.container.appendChild(this.draggableArea);
  }

  private addItem() {
    const content = this.input.value.trim();
    if (!content) return;

    const newItem: TextItem = {
      id: crypto.randomUUID(),
      content,
      order: this.items.length,
      parentId: null,
      children: []
    };

    this.items.push(newItem);
    this.input.value = '';
    this.renderItems();
  }

  private createItemElement(item: TextItem, level: number = 0): HTMLElement {
    const div = document.createElement('div');
    div.className = 'draggable-item';
    div.draggable = true;
    div.dataset.id = item.id;
    div.dataset.level = level.toString();
    div.textContent = item.content;
    div.style.marginLeft = `${level * 20}px`;
    
    div.addEventListener('dragstart', (e) => {
      this.currentDragId = item.id;
      handleDragStart(e, item.id);
    });
    div.addEventListener('dragend', (e) => {
      this.currentDragId = null;
      handleDragEnd(e);
    });
    
    return div;
  }

  private handleDrop(e: DragEvent) {
    e.preventDefault();
    const draggedId = e.dataTransfer?.getData('text/plain');
    if (!draggedId) return;

    const { index, targetId, isNested, isInvalid, level } = getDropPosition(
      e,
      this.draggableArea,
      draggedId,
      this.items
    );
    
    if (isInvalid) return;
    
    const draggedItem = findItem(this.items, draggedId);
    if (!draggedItem) return;

    // Remove item from its current position
    removeItemFromTree(this.items, draggedId);

    // Reset children array if moving to a new level
    draggedItem.children = draggedItem.children || [];

    if (isNested && targetId) {
      // Add as child
      const parent = findItem(this.items, targetId);
      if (parent && !isDescendant(draggedId, parent.id, this.items)) {
        draggedItem.parentId = targetId;
        const insertIndex = 0;
        parent.children.splice(insertIndex, 0, draggedItem);
      }
    } else {
      // Find the correct parent based on the target level
      const items = Array.from(this.draggableArea.querySelectorAll('.draggable-item:not(.dragging)'));
      let targetParentId: string | null = null;
      
      if (level > 0) {
        for (let i = index - 1; i >= 0; i--) {
          const currentLevel = parseInt(items[i].getAttribute('data-level') || '0', 10);
          if (currentLevel < level) {
            targetParentId = items[i].getAttribute('data-id');
            break;
          }
        }
      }

      if (targetParentId) {
        const parent = findItem(this.items, targetParentId);
        if (parent && !isDescendant(draggedId, parent.id, this.items)) {
          draggedItem.parentId = targetParentId;
          const siblings = parent.children;
          let siblingIndex = 0;
          
          // Find the correct position among siblings
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemLevel = parseInt(item.getAttribute('data-level') || '0', 10);
            const itemId = item.getAttribute('data-id');
            
            if (itemLevel === level && itemId && parent.children.some(child => child.id === itemId)) {
              if (i < index) {
                siblingIndex++;
              } else {
                break;
              }
            }
          }
          
          parent.children.splice(siblingIndex, 0, draggedItem);
        }
      } else {
        draggedItem.parentId = null;
        this.items.splice(index, 0, draggedItem);
      }
    }

    updateItemOrders(this.items);
    this.renderItems();
  }

  private renderItems() {
    const indicator = this.draggableArea.querySelector('.drop-indicator');
    this.draggableArea.innerHTML = '';
    if (indicator) {
      this.draggableArea.appendChild(indicator);
    }
    
    const renderLevel = (items: TextItem[], level: number = 0) => {
      items
        .sort((a, b) => a.order - b.order)
        .forEach(item => {
          this.draggableArea.appendChild(this.createItemElement(item, level));
          if (item.children && item.children.length > 0) {
            renderLevel(item.children, level + 1);
          }
        });
    };
    
    renderLevel(this.items.filter(item => item.parentId === null));
  }
}