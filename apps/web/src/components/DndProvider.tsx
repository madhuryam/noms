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

export type DragItemType = 'recipe' | 'shopping-item';

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
}

export function DndProvider({ children }: DndProviderProps) {
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

  const handleDragEnd = useCallback((_event: DragEndEvent) => {
    // Shopping items are handled by their own component via useSortable
    setActiveItem(null);
    setOverId(null);
  }, []);

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
      <DndStateContext.Provider value={{ activeItem, overId }}>{children}</DndStateContext.Provider>
    </DndContext>
  );
}
