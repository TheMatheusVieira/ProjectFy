import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.appOwnership === 'expo';
const isAndroid = Platform.OS === 'android';

// Configuração básica removida do nível superior para evitar crash na inicialização

class NotificationService {
    /**
     * Inicializa as configurações de notificação
     */
    static async init() {
        if (!isExpoGo || !isAndroid) {
            try {
                Notifications.setNotificationHandler({
                    handleNotification: async () => ({
                        shouldShowAlert: true,
                        shouldPlaySound: true,
                        shouldSetBadge: false,
                        shouldShowBanner: true,
                        shouldShowList: true,
                    }),
                });
            } catch (e) {
                console.warn('NotificationService: Failed to set handler', e);
            }
        }
    }

    /**
     * Solicita permissão para enviar notificações
     */
    static async requestPermissions(): Promise<boolean> {
        if (isExpoGo && isAndroid) {
            console.warn('NotificationService: Device notifications are limited in Expo Go (Android SDK 53+).');
            return false;
        }

        if (!Device.isDevice) {
            return false;
        }

        try {
            // Verifica se o módulo nativo de notificações está disponível
            if (!Notifications.getPermissionsAsync) {
                console.warn('NotificationService: expo-notifications native module not available');
                return false;
            }

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                return false;
            }

            if (Platform.OS === 'android') {
                // Tenta criar o canal de notificação, mas não falha se der erro
                try {
                    await Notifications.setNotificationChannelAsync('default', {
                        name: 'default',
                        importance: Notifications.AndroidImportance.MAX,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: '#FF231F7C',
                    });
                } catch (channelError) {
                    console.warn('NotificationService: Error creating notification channel', channelError);
                }
            }

            return true;
        } catch (error) {
            console.error('NotificationService: Fatal error requesting permissions', error);
            return false;
        }
    }

    /**
     * Agenda uma notificação local imediata
     */
    static async scheduleLocalNotification(title: string, body: string, data: any = {}) {
        if (isExpoGo && isAndroid) return;

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                },
                trigger: null,
            });
        } catch (error) {
            console.error('NotificationService: Error scheduling local notification', error);
        }
    }

    /**
     * Agenda uma notificação para uma data específica
     */
    static async scheduleNotificationAtDate(title: string, body: string, date: Date, data: any = {}) {
        if (isExpoGo && isAndroid) return;

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date,
                } as Notifications.DateTriggerInput,
            });
        } catch (error) {
            console.error('NotificationService: Error scheduling notification', error);
        }
    }

    /**
     * Cancela todas as notificações agendadas
     */
    static async cancelAllNotifications() {
        if (isExpoGo && isAndroid) return;

        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
        } catch (error) {
            console.error('NotificationService: Error cancelling notifications', error);
        }
    }
}

export default NotificationService;
