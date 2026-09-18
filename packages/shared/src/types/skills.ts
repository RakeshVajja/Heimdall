export type SkillCategory =
  | 'coding'
  | 'debugging'
  | 'testing'
  | 'database'
  | 'research'
  | 'writing'
  | 'custom';

export interface SkillParameter {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  defaultValue?: string | number | boolean;
  options?: string[];
  description?: string;
  required?: boolean;
}

export interface SkillDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: SkillCategory;
  systemPrompt: string;
  userPromptTemplate?: string;
  allowedTools: string[];
  preferredProvider?: 'groq' | 'gemini' | 'ollama';
  preferredModel?: string;
  temperature?: number;
  parameters: SkillParameter[];
  isBuiltIn: boolean;
  authorId?: string;
  iconName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillExecutionRequest {
  skillId: string;
  input: string;
  parameters?: Record<string, unknown>;
  conversationId?: string;
}
