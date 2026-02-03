import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import uuid from 'react-native-uuid';
import { User, Project, Task, ScheduleEvent, Alert, Note, Attachment, Appointment, TimeLog, Purchase, UserSettings } from '../types';

class StorageService {
  // Keys para o AsyncStorage
  private static readonly KEYS = {
    USERS: 'users',
    PROJECTS: 'projects',
    TASKS: 'tasks',
    SCHEDULE: 'schedule',
    ALERTS: 'alerts',
    NOTES: 'notes',
    APPOINTMENTS: 'appointments',
    TIME_LOGS: 'time_logs',
    PURCHASES: 'purchases',
    USER_TOKEN: 'userToken',
    CURRENT_USER: 'currentUser',
  };

  // Diretório para anexos
  private static readonly ATTACHMENTS_DIR = `${FileSystem.documentDirectory}attachments/`;

  private static async ensureAttachmentsDir(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.ATTACHMENTS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.ATTACHMENTS_DIR, { intermediates: true });
    }
  }

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

      const userToSave = {
        ...user,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        users[existingIndex] = userToSave;
      } else {
        users.push(userToSave);
      }

      await AsyncStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      const users = await this.getUsers();
      const filteredUsers = users.filter(u => u.id !== userId);
      await AsyncStorage.setItem(this.KEYS.USERS, JSON.stringify(filteredUsers));
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
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

  static getDefaultSettings(): UserSettings {
    return {
      notifications: {
        enabled: true,
        deadlines: true,
        tasks: true,
        appointments: true,
      },
      theme: 'system',
      language: 'pt-BR',
    };
  }

  static async updateUserSettings(userId: string, settings: UserSettings): Promise<void> {
    try {
      const users = await this.getUsers();
      const userIndex = users.findIndex(u => u.id === userId);

      if (userIndex >= 0) {
        users[userIndex].settings = settings;
        users[userIndex].updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(this.KEYS.USERS, JSON.stringify(users));

        // Se for o usuário atual, atualizar também
        const currentUser = await this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          currentUser.settings = settings;
          currentUser.updatedAt = users[userIndex].updatedAt;
          await this.setCurrentUser(currentUser);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar configurações do usuário:', error);
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

      const projectToSave = {
        ...project,
        id: project.id || uuid.v4() as string,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        projects[existingIndex] = projectToSave;
      } else {
        projects.push(projectToSave);
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
      const project = projects.find(p => p.id === projectId);

      // Remover arquivos físicos dos anexos
      if (project?.attachments) {
        for (const attachment of project.attachments) {
          await this.deleteAttachmentFile(attachment.uri);
        }
      }

      const filteredProjects = projects.filter(p => p.id !== projectId);
      await AsyncStorage.setItem(this.KEYS.PROJECTS, JSON.stringify(filteredProjects));

      // Também remover tarefas, notas, agendamentos, logs de tempo e compras associados
      await this.deleteTasksByProject(projectId);
      await this.deleteNotesByProject(projectId);
      await this.deleteAppointmentsByProject(projectId);
      await this.deleteTimeLogsByProject(projectId);
      await this.deletePurchasesByProject(projectId);
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

      const taskToSave = {
        ...task,
        id: task.id || uuid.v4() as string,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        tasks[existingIndex] = taskToSave;
      } else {
        tasks.push(taskToSave);
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

  // ============ ANOTAÇÕES ============
  static async getNotes(): Promise<Note[]> {
    try {
      const notes = await AsyncStorage.getItem(this.KEYS.NOTES);
      return notes ? JSON.parse(notes) : [];
    } catch (error) {
      console.error('Erro ao buscar anotações:', error);
      return [];
    }
  }

  static async getProjectNotes(projectId: string): Promise<Note[]> {
    try {
      const notes = await this.getNotes();
      return notes.filter(n => n.projectId === projectId);
    } catch (error) {
      console.error('Erro ao buscar anotações do projeto:', error);
      return [];
    }
  }

  static async saveNote(note: Note): Promise<void> {
    try {
      const notes = await this.getNotes();
      const existingIndex = notes.findIndex(n => n.id === note.id);

      const noteToSave = {
        ...note,
        id: note.id || uuid.v4() as string,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        notes[existingIndex] = noteToSave;
      } else {
        notes.push(noteToSave);
      }

      await AsyncStorage.setItem(this.KEYS.NOTES, JSON.stringify(notes));
    } catch (error) {
      console.error('Erro ao salvar anotação:', error);
      throw error;
    }
  }

  static async deleteNote(noteId: string): Promise<void> {
    try {
      const notes = await this.getNotes();
      const filteredNotes = notes.filter(n => n.id !== noteId);
      await AsyncStorage.setItem(this.KEYS.NOTES, JSON.stringify(filteredNotes));
    } catch (error) {
      console.error('Erro ao deletar anotação:', error);
      throw error;
    }
  }

  static async deleteNotesByProject(projectId: string): Promise<void> {
    try {
      const notes = await this.getNotes();
      const filteredNotes = notes.filter(n => n.projectId !== projectId);
      await AsyncStorage.setItem(this.KEYS.NOTES, JSON.stringify(filteredNotes));
    } catch (error) {
      console.error('Erro ao deletar anotações do projeto:', error);
      throw error;
    }
  }

  // ============ ANEXOS (Arquivos) ============
  static async saveAttachment(projectId: string, fileUri: string, fileName: string, fileType: string, fileSize: number): Promise<Attachment> {
    try {
      await this.ensureAttachmentsDir();

      const id = uuid.v4() as string;
      const extension = fileName.split('.').pop();
      const newFileName = `${id}.${extension}`;
      const newUri = `${this.ATTACHMENTS_DIR}${newFileName}`;

      // Copiar arquivo para o diretório local do app
      await FileSystem.copyAsync({
        from: fileUri,
        to: newUri
      });

      const attachment: Attachment = {
        id,
        name: fileName,
        type: fileType,
        uri: newUri,
        size: fileSize,
        createdAt: new Date().toISOString()
      };

      // Atualizar o projeto com o novo anexo
      const projects = await this.getProjects();
      const projectIndex = projects.findIndex(p => p.id === projectId);
      if (projectIndex >= 0) {
        const project = projects[projectIndex];
        const attachments = project.attachments || [];
        projects[projectIndex] = {
          ...project,
          attachments: [...attachments, attachment],
          updatedAt: new Date().toISOString()
        };
        await AsyncStorage.setItem(this.KEYS.PROJECTS, JSON.stringify(projects));
      }

      return attachment;
    } catch (error) {
      console.error('Erro ao salvar anexo:', error);
      throw error;
    }
  }

  static async deleteAttachment(projectId: string, attachmentId: string): Promise<void> {
    try {
      const projects = await this.getProjects();
      const projectIndex = projects.findIndex(p => p.id === projectId);

      if (projectIndex >= 0) {
        const project = projects[projectIndex];
        const attachment = project.attachments?.find(a => a.id === attachmentId);

        if (attachment) {
          // Remover arquivo físico
          await this.deleteAttachmentFile(attachment.uri);

          // Atualizar lista no AsyncStorage
          const filteredAttachments = project.attachments?.filter(a => a.id !== attachmentId) || [];
          projects[projectIndex] = {
            ...project,
            attachments: filteredAttachments,
            updatedAt: new Date().toISOString()
          };
          await AsyncStorage.setItem(this.KEYS.PROJECTS, JSON.stringify(projects));
        }
      }
    } catch (error) {
      console.error('Erro ao deletar anexo:', error);
      throw error;
    }
  }

  private static async deleteAttachmentFile(uri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri);
      }
    } catch (error) {
      console.error('Erro ao deletar arquivo físico:', error);
    }
  }

  // ============ AGENDAMENTOS ============
  static async getAppointments(): Promise<Appointment[]> {
    try {
      const appointments = await AsyncStorage.getItem(this.KEYS.APPOINTMENTS);
      return appointments ? JSON.parse(appointments) : [];
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      return [];
    }
  }

  static async getUserAppointments(userId: string): Promise<Appointment[]> {
    try {
      const appointments = await this.getAppointments();
      return appointments.filter(a => a.userId === userId);
    } catch (error) {
      console.error('Erro ao buscar agendamentos do usuário:', error);
      return [];
    }
  }

  static async saveAppointment(appointment: Appointment): Promise<void> {
    try {
      const appointments = await this.getAppointments();
      const existingIndex = appointments.findIndex(a => a.id === appointment.id);

      const appointmentToSave = {
        ...appointment,
        id: appointment.id || uuid.v4() as string,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        appointments[existingIndex] = appointmentToSave;
      } else {
        appointments.push(appointmentToSave);
      }

      await AsyncStorage.setItem(this.KEYS.APPOINTMENTS, JSON.stringify(appointments));
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      throw error;
    }
  }

  static async deleteAppointment(appointmentId: string): Promise<void> {
    try {
      const appointments = await this.getAppointments();
      const filteredAppointments = appointments.filter(a => a.id !== appointmentId);
      await AsyncStorage.setItem(this.KEYS.APPOINTMENTS, JSON.stringify(filteredAppointments));
    } catch (error) {
      console.error('Erro ao deletar agendamento:', error);
      throw error;
    }
  }

  static async deleteAppointmentsByProject(projectId: string): Promise<void> {
    try {
      const appointments = await this.getAppointments();
      const filteredAppointments = appointments.filter(a => a.projectId !== projectId);
      await AsyncStorage.setItem(this.KEYS.APPOINTMENTS, JSON.stringify(filteredAppointments));
    } catch (error) {
      console.error('Erro ao deletar agendamentos do projeto:', error);
      throw error;
    }
  }

  // ============ CONTADOR DE HORAS ============
  static async getTimeLogs(): Promise<TimeLog[]> {
    try {
      const logs = await AsyncStorage.getItem(this.KEYS.TIME_LOGS);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Erro ao buscar logs de tempo:', error);
      return [];
    }
  }

  static async getProjectTimeLogs(projectId: string): Promise<TimeLog[]> {
    try {
      const logs = await this.getTimeLogs();
      return logs.filter(l => l.projectId === projectId);
    } catch (error) {
      console.error('Erro ao buscar logs de tempo do projeto:', error);
      return [];
    }
  }

  static async saveTimeLog(log: TimeLog): Promise<void> {
    try {
      const logs = await this.getTimeLogs();
      const existingIndex = logs.findIndex(l => l.id === log.id);

      const logToSave = {
        ...log,
        id: log.id || uuid.v4() as string,
        synced: false,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        logs[existingIndex] = logToSave;
      } else {
        logs.push(logToSave);
      }

      await AsyncStorage.setItem(this.KEYS.TIME_LOGS, JSON.stringify(logs));
    } catch (error) {
      console.error('Erro ao salvar log de tempo:', error);
      throw error;
    }
  }

  static async deleteTimeLog(logId: string): Promise<void> {
    try {
      const logs = await this.getTimeLogs();
      const filteredLogs = logs.filter(l => l.id !== logId);
      await AsyncStorage.setItem(this.KEYS.TIME_LOGS, JSON.stringify(filteredLogs));
    } catch (error) {
      console.error('Erro ao deletar log de tempo:', error);
      throw error;
    }
  }

  static async deleteTimeLogsByProject(projectId: string): Promise<void> {
    try {
      const logs = await this.getTimeLogs();
      const filteredLogs = logs.filter(l => l.projectId !== projectId);
      await AsyncStorage.setItem(this.KEYS.TIME_LOGS, JSON.stringify(filteredLogs));
    } catch (error) {
      console.error('Erro ao deletar logs de tempo do projeto:', error);
      throw error;
    }
  }

  // ============ COMPRAS ============
  static async getPurchases(): Promise<Purchase[]> {
    try {
      const purchases = await AsyncStorage.getItem(this.KEYS.PURCHASES);
      return purchases ? JSON.parse(purchases) : [];
    } catch (error) {
      console.error('Erro ao buscar compras:', error);
      return [];
    }
  }

  static async getProjectPurchases(projectId: string): Promise<Purchase[]> {
    try {
      const purchases = await this.getPurchases();
      return purchases.filter(p => p.projectId === projectId);
    } catch (error) {
      console.error('Erro ao buscar compras do projeto:', error);
      return [];
    }
  }

  static async savePurchase(purchase: Purchase): Promise<void> {
    try {
      const purchases = await this.getPurchases();
      const existingIndex = purchases.findIndex(p => p.id === purchase.id);

      const purchaseToSave = {
        ...purchase,
        id: purchase.id || uuid.v4() as string,
        synced: false,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        purchases[existingIndex] = purchaseToSave;
      } else {
        purchases.push(purchaseToSave);
      }

      await AsyncStorage.setItem(this.KEYS.PURCHASES, JSON.stringify(purchases));
    } catch (error) {
      console.error('Erro ao salvar compra:', error);
      throw error;
    }
  }

  static async deletePurchase(purchaseId: string): Promise<void> {
    try {
      const purchases = await this.getPurchases();
      const filteredPurchases = purchases.filter(p => p.id !== purchaseId);
      await AsyncStorage.setItem(this.KEYS.PURCHASES, JSON.stringify(filteredPurchases));
    } catch (error) {
      console.error('Erro ao deletar compra:', error);
      throw error;
    }
  }

  static async deletePurchasesByProject(projectId: string): Promise<void> {
    try {
      const purchases = await this.getPurchases();
      const filteredPurchases = purchases.filter(p => p.projectId !== projectId);
      await AsyncStorage.setItem(this.KEYS.PURCHASES, JSON.stringify(filteredPurchases));
    } catch (error) {
      console.error('Erro ao deletar compras do projeto:', error);
      throw error;
    }
  }

  // ============ AGENDA (Eventos Legados/Outros) ============
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

      const eventToSave = {
        ...event,
        id: event.id || uuid.v4() as string,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        events[existingIndex] = eventToSave;
      } else {
        events.push(eventToSave);
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

      const alertToSave = {
        ...alert,
        id: alert.id || uuid.v4() as string,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        alerts[existingIndex] = alertToSave;
      } else {
        alerts.push(alertToSave);
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
        alerts[alertIndex].updatedAt = new Date().toISOString();
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
        this.KEYS.NOTES,
        this.KEYS.APPOINTMENTS,
        this.KEYS.TIME_LOGS,
        this.KEYS.PURCHASES,
        this.KEYS.USER_TOKEN,
        this.KEYS.CURRENT_USER,
      ]);

      // Limpar diretório de anexos
      const dirInfo = await FileSystem.getInfoAsync(this.ATTACHMENTS_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.ATTACHMENTS_DIR);
      }
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
        notes: await this.getNotes(),
        appointments: await this.getAppointments(),
        timeLogs: await this.getTimeLogs(),
        purchases: await this.getPurchases(),
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
    notes?: Note[];
    appointments?: Appointment[];
    timeLogs?: TimeLog[];
    purchases?: Purchase[];
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
      if (data.notes) {
        await AsyncStorage.setItem(this.KEYS.NOTES, JSON.stringify(data.notes));
      }
      if (data.appointments) {
        await AsyncStorage.setItem(this.KEYS.APPOINTMENTS, JSON.stringify(data.appointments));
      }
      if (data.timeLogs) {
        await AsyncStorage.setItem(this.KEYS.TIME_LOGS, JSON.stringify(data.timeLogs));
      }
      if (data.purchases) {
        await AsyncStorage.setItem(this.KEYS.PURCHASES, JSON.stringify(data.purchases));
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