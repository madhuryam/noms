export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  servings: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
