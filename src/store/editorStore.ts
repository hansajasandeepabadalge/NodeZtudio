import type { Tool } from '@/types/tools';

// Global editor state — expand with Zustand or Redux as the app grows.
export interface EditorState {
    activeTool: Tool;
    activeColor: string;
}

// Placeholder — replace with your state manager of choice.
export {};
