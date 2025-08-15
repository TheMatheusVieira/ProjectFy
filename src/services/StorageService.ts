import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Project, Task, ScheduleEvent, Alert } from '../types';

class StorageService {
  // Keys para o AsyncStorage
  private static readonly KEYS = {
    USERS: 'users',
    PROJECTS: 'projects',
    TASKS: 'tasks',
    SCHEDULE: 'schedule',
    ALERTS: 'alerts',
    USER_TOKEN: 'userToken',
    CURRENT_USER: 'currentUser',
  };

  // ============ USUÁRIOS ============
  static async getUsers(): Promise<User[]> {
    try {
      const users = await AsyncStorage.getItem(this.KEYS.USERS);
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return [];
    }
  }

  static async saveUser(user: User): Promise<void> {
    try {
      const users = await this.getUsers();
      const existingIndex = users.findIndex(u => u.id === user.id);
      
      if (existingIndex >= 0) {
        users[existingIndex] = user;
      } else {
        users.push(user);
      }
      
      await AsyncStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      throw error;
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const currentUser = await AsyncStorage.getItem(this.KEYS.CURRENT_USER);
      return currentUser ? JSON.parse(currentUser) : null;
    } catch (error) {
      console.error('Erro ao buscar usuário atual:', error);
      return null;
    }
  }

  static async setCurrentUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(user));
    } catch (error) {
      console.error('Erro ao definir usuário atual:', error);
      throw error;
    }
  }

  // ============ AUTENTICAÇÃO ============
  static async setUserToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.USER_TOKEN, token);
    } catch (error) {
      console.error('Erro ao salvar token:', error);
      throw error;
    }
  }

  static async getUserToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.KEYS.USER_TOKEN);
    } catch (error) {
      console.error('Erro ao buscar token:', error);
      return null;
    }
  }

  static async removeAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.KEYS.USER_TOKEN, this.KEYS.CURRENT_USER]);
    } catch (error) {
      console.error('Erro ao remover dados de auth:', error);
      throw error;
    }
  }

  // ============ PROJETOS ============
  static async getProjects(): Promise<Project[]> {
    try {
      const projects = await AsyncStorage.getItem(this.KEYS.PROJECTS);
      return projects ? JSON.parse(projects) : [];
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      return [];
    }
  }

  static async getUserProjects(userId: string): Promise<Project[]> {
    try {
      const projects = await this.getProjects();
      return projects.filter(p => p.userId === userId);
    } catch (error) {
      console.error('Erro ao buscar projetos do usuário:', error);
      return [];
    }
  }

  static async saveProject(project: Project): Promise<void> {
    try {
      const projects = await this.getProjects();
      const existingIndex = projects.findIndex(p => p.id === project.id);
      
      if (existingIndex >= 0) {
        projects[existingIndex] = { ...project, updatedAt: new Date().toISOString() };
      } else {
        projects.push(project);
      }
      
      await AsyncStorage.setItem(this.KEYS.PROJECTS, JSON.stringify(projects));
    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
      throw error;
    }
  }

  static async deleteProject(projectId: string): Promise<void> {
    try {
      const projects = await this.getProjects();
      const filteredProjects = projects.filter(p => p.id !== projectId);
      await AsyncStorage.setItem(this.KEYS.PROJECTS, JSON.stringify(filteredProjects));
      
      // Também remover tarefas associadas
      await this.deleteTasksByProject(projectId);
    } catch (error) {
      console.error('Erro ao deletar projeto:', error);
      throw error;
    }
  }

  // ============ TAREFAS ============
  static async getTasks(): Promise<Task[]> {
    try {
      const tasks = await AsyncStorage.getItem(this.KEYS.TASKS);
      return tasks ? JSON.parse(tasks) : [];
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      return [];
    }
  }

  static async getProjectTasks(projectId: string): Promise<Task[]> {
    try {
      const tasks = await this.getTasks();
      return tasks.filter(t => t.projectId === projectId);
    } catch (error) {
      console.error('Erro ao buscar tarefas do projeto:', error);
      return [];
    }
  }

  static async getUserTasks(userId: string): Promise<Task[]> {
    try {
      const tasks = await this.getTasks();
      return tasks.filter(t => t.userId === userId);
    } catch (error) {
      console.error('Erro ao buscar tarefas do usuário:', error);
      return [];
    }
  }

  static async saveTask(task: Task): Promise<void> {
    try {
      const tasks = await this.getTasks();
      const existingIndex = tasks.findIndex(t => t.id === task.id);
      
      if (existingIndex >= 0) {
        tasks[existingIndex] = { ...task, updatedAt: new Date().toISOString() };
      } else {
        tasks.push(task);
      }
      
      await AsyncStorage.setItem(this.KEYS.TASKS, JSON.stringify(tasks));
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      throw error;
    }
  }

  static async deleteTask(taskId: string): Promise<void> {
    try {
      const tasks = await this.getTasks();
      const filteredTasks = tasks.filter(t => t.id !== taskId);
      await AsyncStorage.setItem(this.KEYS.TASKS, JSON.stringify(filteredTasks));
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      throw error;
    }
  }

  static async deleteTasksByProject(projectId: string): Promise<void> {
    try {
      const tasks = await this.getTasks();
      const filteredTasks = tasks.filter(t => t.projectId !== projectId);
      await AsyncStorage.setItem(this.KEYS.TASKS, JSON.stringify(filteredTasks));
    } catch (error) {
      console.error('Erro ao deletar tarefas do projeto:', error);
      throw error;
    }
  }

  // ============ AGENDA ============
  static async getScheduleEvents(): Promise<ScheduleEvent[]> {
    try {
      const events = await AsyncStorage.getItem(this.KEYS.SCHEDULE);
      return events ? JSON.parse(events) : [];
    } catch (error) {
      console.error('Erro ao buscar eventos da agenda:', error);
      return [];
    }
  }

  static async getUserScheduleEvents(userId: string): Promise<ScheduleEvent[]> {
    try {
      const events = await this.getScheduleEvents();
      return events.filter(e => e.userId === userId);
    } catch (error) {
      console.error('Erro ao buscar eventos do usuário:', error);
      return [];
    }
  }

  static async saveScheduleEvent(event: ScheduleEvent): Promise<void> {
    try {
      const events = await this.getScheduleEvents();
      const existingIndex = events.findIndex(e => e.id === event.id);
      
      if (existingIndex >= 0) {
        events[existingIndex] = event;
      } else {
        events.push(event);
      }
      
      await AsyncStorage.setItem(this.KEYS.SCHEDULE, JSON.stringify(events));
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      throw error;
    }
  }

  static async deleteScheduleEvent(eventId: string): Promise<void> {
    try {
      const events = await this.getScheduleEvents();
      const filteredEvents = events.filter(e => e.id !== eventId);
      await AsyncStorage.setItem(this.KEYS.SCHEDULE, JSON.stringify(filteredEvents));
    } catch (error) {
      console.error('Erro ao deletar evento:', error);
      throw error;
    }
  }

  // ============ ALERTAS ============
  static async getAlerts(): Promise<Alert[]> {
    try {
      const alerts = await AsyncStorage.getItem(this.KEYS.ALERTS);
      return alerts ? JSON.parse(alerts) : [];
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
      return [];
    }
  }

  static async getUserAlerts(userId: string): Promise<Alert[]> {
    try {
      const alerts = await this.getAlerts();
      return alerts.filter(a => a.userId === userId);
    } catch (error) {
      console.error('Erro ao buscar alertas do usuário:', error);
      return [];
    }
  }

  static async saveAlert(alert: Alert): Promise<void> {
    try {
      const alerts = await this.getAlerts();
      const existingIndex = alerts.findIndex(a => a.id === alert.id);
      
      if (existingIndex >= 0) {
        alerts[existingIndex] = alert;
      } else {
        alerts.push(alert);
      }
      
      await AsyncStorage.setItem(this.KEYS.ALERTS, JSON.stringify(alerts));
    } catch (error) {
      console.error('Erro ao salvar alerta:', error);
      throw error;
    }
  }

  static async markAlertAsRead(alertId: string): Promise<void> {
    try {
      const alerts = await this.getAlerts();
      const alertIndex = alerts.findIndex(a => a.id === alertId);
      
      if (alertIndex >= 0) {
        alerts[alertIndex].read = true;
        await AsyncStorage.setItem(this.KEYS.ALERTS, JSON.stringify(alerts));
      }
    } catch (error) {
      console.error('Erro ao marcar alerta como lido:', error);
      throw error;
    }
  }

  static async deleteAlert(alertId: string): Promise<void> {
    try {
      const alerts = await this.getAlerts();
      const filteredAlerts = alerts.filter(a => a.id !== alertId);
      await AsyncStorage.setItem(this.KEYS.ALERTS, JSON.stringify(filteredAlerts));
    } catch (error) {
      console.error('Erro ao deletar alerta:', error);
      throw error;
    }
  }

  // ============ UTILITÁRIOS ============
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.KEYS.USERS,
        this.KEYS.PROJECTS,
        this.KEYS.TASKS,
        this.KEYS.SCHEDULE,
        this.KEYS.ALERTS,
        this.KEYS.USER_TOKEN,
        this.KEYS.CURRENT_USER,
      ]);
    } catch (error) {
      console.error('Erro ao limpar todos os dados:', error);
      throw error;
    }
  }

  static async exportData(): Promise<object> {
    try {
      const data = {
        users: await this.getUsers(),
        projects: await this.getProjects(),
        tasks: await this.getTasks(),
        schedule: await this.getScheduleEvents(),
        alerts: await this.getAlerts(),
      };
      return data;
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      throw error;
    }
  }

  static async importData(data: {
    users?: User[];
    projects?: Project[];
    tasks?: Task[];
    schedule?: ScheduleEvent[];
    alerts?: Alert[];
  }): Promise<void> {
    try {
      if (data.users) {
        await AsyncStorage.setItem(this.KEYS.USERS, JSON.stringify(data.users));
      }
      if (data.projects) {
        await AsyncStorage.setItem(this.KEYS.PROJECTS, JSON.stringify(data.projects));
      }
      if (data.tasks) {
        await AsyncStorage.setItem(this.KEYS.TASKS, JSON.stringify(data.tasks));
      }
      if (data.schedule) {
        await AsyncStorage.setItem(this.KEYS.SCHEDULE, JSON.stringify(data.schedule));
      }
      if (data.alerts) {
        await AsyncStorage.setItem(this.KEYS.ALERTS, JSON.stringify(data.alerts));
      }
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      throw error;
    }
  }
}

export default StorageService;