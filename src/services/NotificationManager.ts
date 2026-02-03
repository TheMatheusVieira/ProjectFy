import { Alert } from '../types';
import StorageService from './StorageService';
import uuid from 'react-native-uuid';
import NotificationService from './NotificationService';

class NotificationManager {
    static async createProjectAlert(projectId: string, projectName: string, type: 'deadline' | 'status') {
        const user = await StorageService.getCurrentUser();
        if (!user) return;

        const message = type === 'deadline'
            ? `O prazo do projeto "${projectName}" está próximo!`
            : `O status do projeto "${projectName}" foi atualizado.`;

        const alert: Alert = {
            id: uuid.v4() as string,
            userId: user.id,
            projectId,
            message,
            type: type === 'deadline' ? 'warning' : 'info',
            read: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await StorageService.saveAlert(alert);
        await NotificationService.scheduleLocalNotification(
            type === 'deadline' ? 'Prazo de Projeto' : 'Atualização de Projeto',
            message
        );
    }

    static async createTaskAlert(taskId: string, taskTitle: string, projectName: string) {
        const user = await StorageService.getCurrentUser();
        if (!user) return;

        const message = `Nova tarefa atribuída: "${taskTitle}" no projeto "${projectName}"`;

        const alert: Alert = {
            id: uuid.v4() as string,
            userId: user.id,
            taskId,
            message,
            type: 'info',
            read: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await StorageService.saveAlert(alert);
        await NotificationService.scheduleLocalNotification('Nova Tarefa', message);
    }

    static async createSystemAlert(message: string, type: Alert['type'] = 'info') {
        const user = await StorageService.getCurrentUser();
        if (!user) return;

        const alert: Alert = {
            id: uuid.v4() as string,
            userId: user.id,
            message,
            type,
            read: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await StorageService.saveAlert(alert);
        await NotificationService.scheduleLocalNotification('Sistema', message);
    }

    static async checkDeadlines() {
        const user = await StorageService.getCurrentUser();
        if (!user) return;

        const projects = await StorageService.getUserProjects(user.id);
        const today = new Date();

        projects.forEach(project => {
            if (project.deadline && new Date(project.deadline) < today) {
                this.createProjectAlert(project.id, project.name, 'deadline');
            }
        });
    }
}

export default NotificationManager;
