import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert as RNAlert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, THEME } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import { Alert, User } from '../../types';

export default function AlertsScreen() {
  const navigation = useNavigation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await StorageService.getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        const userAlerts = await StorageService.getUserAlerts(currentUser.id);
        setAlerts(userAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
      RNAlert.alert('Erro', 'Não foi possível carregar as notificações.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (alertId: string) => {
    try {
      await StorageService.markAlertAsRead(alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
    }
  };

  const handleDeleteAlert = (alertId: string) => {
    RNAlert.alert(
      'Excluir Notificação',
      'Deseja remover esta notificação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteAlert(alertId);
              setAlerts(prev => prev.filter(a => a.id !== alertId));
            } catch (error) {
              console.error('Erro ao excluir alerta:', error);
            }
          },
        },
      ]
    );
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'warning': return { name: 'warning-outline', color: COLORS.warning };
      case 'error': return { name: 'alert-circle-outline', color: COLORS.error };
      case 'success': return { name: 'checkmark-circle-outline', color: COLORS.success };
      default: return { name: 'information-circle-outline', color: COLORS.info };
    }
  };

  const renderAlertItem = ({ item }: { item: Alert }) => {
    const icon = getAlertIcon(item.type);
    return (
      <TouchableOpacity 
        style={[styles.alertCard, !item.read && styles.unreadCard]}
        onPress={() => handleMarkAsRead(item.id)}
      >
        <View style={styles.alertIconContainer}>
          <Ionicons name={icon.name as any} size={24} color={icon.color} />
        </View>
        <View style={styles.alertContent}>
          <Text style={[styles.alertMessage, !item.read && styles.unreadText]}>
            {item.message}
          </Text>
          <Text style={styles.alertDate}>
            {new Date(item.createdAt).toLocaleDateString('pt-BR')} às {new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteAlert(item.id)}
        >
          <Ionicons name="close" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={renderAlertItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={COLORS.gray[200]} />
            <Text style={styles.emptyText}>Você não tem notificações no momento.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: THEME.spacing.md,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    alignItems: 'center',
    ...THEME.shadows.sm,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary[500],
    backgroundColor: COLORS.primary[50],
  },
  alertIconContainer: {
    marginRight: THEME.spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[700],
    lineHeight: 20,
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  alertDate: {
    fontSize: THEME.fontSize.xs,
    color: COLORS.gray[500],
  },
  deleteButton: {
    padding: THEME.spacing.xs,
    marginLeft: THEME.spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[400],
    marginTop: THEME.spacing.md,
    textAlign: 'center',
  },
});
