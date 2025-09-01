// Tipos para navegação
export type RootStackParamList = {
  Loading: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Projetos: undefined;
  Perfil: undefined;
};

// Tipos para usuário
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  weeklyHours: number;
  dailyHours: number;
  createdAt: string;
  projects: string[]; // IDs dos projetos
  tasks: string[]; // IDs das tarefas
}

// Tipos para projeto
export interface Project {
  id: string;
  name: string;
  description?: string;
  company?: string;
  progress: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  createdAt: string;
  updatedAt: string;
  estimatedHours?: number;
  userId: string;
  tasks: string[]; // IDs das tarefas
  team?: Array<{id: string; name: string; role: string}>;
  attachments?: Attachment[];
}

// Tipos para tarefa
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  projectId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  hoursEstimated?: number;
  hoursSpent?: number;
}

// Tipos para anexos
export interface Attachment {
  id: string;
  name: string;
  type: string;
  uri: string;
  size: number;
  createdAt: string;
}

// Tipos para compromissos da agenda
export interface ScheduleEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  type: 'meeting' | 'deadline' | 'review' | 'other';
  projectId?: string;
  userId: string;
  createdAt: string;
}

// Tipos para alertas
export interface Alert {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  userId: string;
  createdAt: string;
  projectId?: string;
  taskId?: string;
}

// Tipos para estatísticas
export interface Statistics {
  totalProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  hoursWorked: number;
  occupationPercentage: number;
}

// Tipos para formulários
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  weeklyHours: string;
  dailyHours: string;
}

export interface ProjectFormData {
  name: string;
  description: string;
  deadline: string;
  priority: Project['priority'];
}

export interface TaskFormData {
  title: string;
  description: string;
  dueDate: string;
  priority: Task['priority'];
  hoursEstimated: string;
}

// Tipos para contexto de autenticação
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterFormData) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

// Tipos para cores e tema
export interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface Theme {
  colors: {
    primary: ColorPalette;
    secondary: ColorPalette;
    accent: ColorPalette;
    gray: ColorPalette;
    white: string;
    black: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    background: string;
    surface: string;
    card: string;
    overlay: string;
    backdrop: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
  };
  fontWeight: {
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  shadows: {
    sm: object;
    md: object;
    lg: object;
  };
}