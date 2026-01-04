import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';

export type DragItemType = 'recipe' | 'category' | 'shopping-item';

export interface DragItem {
  type: DragItemType;
  id: number | string;
  data: {
    title: string;
    imageUrl?: string | null;
  };
}

interface DndContextValue {
  activeItem: DragItem | null;
  overId: string | null;
}

const DndStateContext = createContext<DndContextValue>({
  activeItem: null,
  overId: null,
});

export function useDndState() {
  return useContext(DndStateContext);
}

interface DndProviderProps {
  children: ReactNode;
  onRecipeDrop?: (recipeId: number, categoryId: number) => void;
  onCategoryDrop?: (categoryId: number, newParentId: number | null) => void;
}

export function DndProvider({ children, onRecipeDrop, onCategoryDrop }: DndProviderProps) {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag before activating
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const dragData = active.data.current as DragItem | undefined;
    if (dragData) {
      setActiveItem(dragData);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id?.toString() ?? null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active: _active, over } = event;

      if (over && activeItem) {
        const overId = over.id.toString();

        // Handle recipe drop onto category
        if (activeItem.type === 'recipe' && overId.startsWith('category-')) {
          const categoryId = parseInt(overId.replace('category-', ''), 10);
          if (!isNaN(categoryId)) {
            onRecipeDrop?.(activeItem.id as number, categoryId);
          }
        }

        // Handle category drop onto category (reparent)
        if (activeItem.type === 'category' && overId.startsWith('category-')) {
          const newParentId = parseInt(overId.replace('category-', ''), 10);
          if (!isNaN(newParentId) && newParentId !== activeItem.id) {
            onCategoryDrop?.(activeItem.id as number, newParentId);
          }
        }

        // Handle category drop to root
        if (activeItem.type === 'category' && overId === 'category-root') {
          onCategoryDrop?.(activeItem.id as number, null);
        }
      }

      setActiveItem(null);
      setOverId(null);
    },
    [activeItem, onRecipeDrop, onCategoryDrop]
  );

  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
    setOverId(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <DndStateContext.Provider value={{ activeItem, overId }}>
        {children}
      </DndStateContext.Provider>
    </DndContext>
  );
}
