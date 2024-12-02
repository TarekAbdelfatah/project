import { TextItem } from '../types/TextItem';

export function findItem(items: TextItem[], id: string): TextItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findItem(item.children, id);
    if (found) return found;
  }
  return null;
}

export function removeItemFromTree(items: TextItem[], id: string): boolean {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      items.splice(i, 1);
      return true;
    }
    if (removeItemFromTree(items[i].children, id)) {
      return true;
    }
  }
  return false;
}

export function getItemsAtLevel(items: TextItem[], level: number, parentId: string | null): TextItem[] {
  const result: TextItem[] = [];
  
  const traverse = (items: TextItem[], currentLevel: number) => {
    for (const item of items) {
      if (currentLevel === level && item.parentId === parentId) {
        result.push(item);
      }
      traverse(item.children, currentLevel + 1);
    }
  };
  
  traverse(items, 0);
  return result;
}

export function updateItemOrders(items: TextItem[]): void {
  const updateLevel = (items: TextItem[]): void => {
    items.forEach((item, index) => {
      item.order = index;
      if (item.children.length > 0) {
        updateLevel(item.children);
      }
    });
  };
  
  updateLevel(items);
}

export function isDescendant(parentId: string, childId: string, items: TextItem[]): boolean {
  const parent = findItem(items, parentId);
  if (!parent) return false;

  const checkChildren = (item: TextItem): boolean => {
    if (item.id === childId) return true;
    return item.children.some(child => checkChildren(child));
  };

  return checkChildren(parent);
}

export function getParentElement(element: Element): Element | null {
  const currentLevel = parseInt(element.getAttribute('data-level') || '0', 10);
  let prev = element.previousElementSibling;
  
  while (prev) {
    const prevLevel = parseInt(prev.getAttribute('data-level') || '0', 10);
    if (prevLevel < currentLevel) {
      return prev;
    }
    prev = prev.previousElementSibling;
  }
  
  return null;
}

export function findParentAtLevel(items: Element[], targetLevel: number, currentIndex: number): Element | null {
  for (let i = currentIndex; i >= 0; i--) {
    const level = parseInt(items[i].getAttribute('data-level') || '0', 10);
    if (level === targetLevel) {
      return items[i];
    }
  }
  return null;
}

export function getSiblingItems(items: TextItem[], parentId: string | null): TextItem[] {
  if (parentId === null) {
    return items.filter(item => item.parentId === null);
  }
  const parent = findItem(items, parentId);
  return parent ? parent.children : [];
}