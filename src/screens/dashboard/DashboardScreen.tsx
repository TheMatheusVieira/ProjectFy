import React, { useState, useEffect, JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

// Types
import { User, Project, Appointment, ScheduleEvent, Alert, RootStackParamList } from '../../types';
import { COLORS, THEME } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import NotificationManager from '../../services/NotificationManager';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { TabParamList } from '../../types';

type DashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Dashboard'>,
  StackNavigationProp<RootStackParamList>
>;

export default function DashboardScreen(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentTime] = useState<Date>(new Date());

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectHours, setProjectHours] = useState<Record<string, number>>({});
  const [totalNotes, setTotalNotes] = useState(0);
  const [commitments, setCommitments] = useState<Appointment[]>([]);

  const navigation = useNavigation<DashboardScreenNavigationProp>();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      // Carregar usuário atual
      const currentUser = await StorageService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        
        // Verificar prazos e gerar alertas
        await NotificationManager.checkDeadlines();
        
        // Carregar projetos do usuário
        const userProjects = await StorageService.getUserProjects(currentUser.id);
        setProjects(userProjects);

        // Carregar logs de tempo e calcular totais por projeto
        const allLogs = await StorageService.getTimeLogs();
        const hoursMap: Record<string, number> = {};
        allLogs.forEach(log => {
          hoursMap[log.projectId] = (hoursMap[log.projectId] || 0) + log.duration;
        });
        setProjectHours(hoursMap);

        // Carregar total de notas
        const allNotes = await StorageService.getNotes();
        setTotalNotes(allNotes.length);

        // Carregar alertas reais
        const userAlerts = await StorageService.getUserAlerts(currentUser.id);
        setAlerts(userAlerts);

        // Carregar agendamentos de hoje
        const userAppointments = await StorageService.getUserAppointments(currentUser.id);
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = userAppointments
          .filter(app => app.date === today)
          .sort((a, b) => a.time.localeCompare(b.time));
        
        setCommitments(todayAppointments);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const calculateOccupation = (): number => {
    if (!user || projects.length === 0) return 0;
    
    // Cálculo simplificado baseado no número de projetos ativos
    const activeProjects = projects.filter(p => p.status === 'in_progress').length;
    const maxProjects = 5; // Assumindo máximo de 5 projetos simultâneos
    return Math.min((activeProjects / maxProjects) * 100, 100);
  };

  const getOccupationColor = (percentage: number): string => {
    if (percentage >= 90) return COLORS.error;
    if (percentage >= 70) return COLORS.warning;
    return COLORS.success;
  };

  const getPriorityColor = (priority: Project['priority']): string => {
    switch (priority) {
      case 'high': return COLORS.error;
      case 'medium': return COLORS.warning;
      default: return COLORS.success;
    }
  };

  const calculateProjectProgress = (project: Project): number => {
    if (!project.estimatedHours || project.estimatedHours === 0) {
      return project.progress || 0;
    }
    const workedHours = (projectHours[project.id] || 0) / 3600;
    const progress = (workedHours / project.estimatedHours) * 100;
    return Math.min(Math.round(progress), 100);
  };

  const getEventIcon = (type: ScheduleEvent['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'meeting': return 'people-outline';
      case 'deadline': return 'alarm-outline';
      case 'review': return 'eye-outline';
      default: return 'calendar-outline';
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  const occupation = calculateOccupation();
  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Olá, {user.name.split(' ')[0]}</Text>
            <Text style={styles.date}>
              {currentTime.toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => navigation.navigate('Alerts')}
            >
              <Ionicons name="notifications-outline" size={26} color={COLORS.gray[700]} />
              {unreadAlertsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.avatar}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.summaryCards}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="folder-outline" size={24} color={COLORS.primary[500]} />
            <Text style={styles.cardNumber}>{projects.length}</Text>
          </View>
          <Text style={styles.cardLabel}>Projetos ativos</Text>
        </View>

        

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bar-chart-outline" size={24} color={COLORS.accent[500]} />
            <Text style={styles.cardNumber}>{Math.round(occupation)}%</Text>
          </View>
          <Text style={styles.cardLabel}>Ocupação</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${occupation}%`,
                  backgroundColor: getOccupationColor(occupation)
                }
              ]}
            />
          </View>
        </View>
      </View>

      {/* Alertas Recentes */}
      {alerts.filter(a => !a.read).length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.warning} />
            <Text style={styles.sectionTitle}>Alertas recentes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
              <Text style={styles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          {alerts.filter(a => !a.read).slice(0, 2).map(alert => (
            <View key={alert.id} style={styles.alertItem}>
              <View style={[styles.alertDot, { backgroundColor: alert.type === 'error' ? COLORS.error : COLORS.warning }]} />
              <Text style={styles.alertText} numberOfLines={2}>{alert.message}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('AllNotes')}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={24} color={COLORS.info} />
            <Text style={styles.cardNumber}>{totalNotes}</Text>
          </View>
          <Text style={styles.cardLabel}>Minhas notas</Text>
        </TouchableOpacity>

      {/* Agenda do dia */}
      <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => navigation.navigate('Agenda')}
          >
            <Ionicons name="calendar-outline" size={20} color={COLORS.secondary[500]} />
            <Text style={styles.sectionTitle}>Agenda de hoje</Text>
            <Ionicons name="chevron-forward-outline" size={16} color={COLORS.gray[400]} />
          </TouchableOpacity>
        {commitments.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum compromisso para hoje.</Text>
        ) : (
          commitments.map((event) => (
            <View key={event.id} style={styles.scheduleItem}>
              <View style={styles.scheduleTime}>
                <Ionicons 
                  name="calendar-outline" 
                  size={16} 
                  color={COLORS.gray[500]} 
                />
                <Text style={styles.timeText}>{event.time}</Text>
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.scheduleTitle}>{event.title}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Projetos em Andamento */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => navigation.navigate('Projetos')}
        >
          <Text style={styles.sectionTitle}>Meus projetos</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateProject')}>
            <Ionicons name="add-outline" size={24} color={COLORS.primary[500]} />
          </TouchableOpacity>
        </TouchableOpacity>
        {projects.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum projeto em andamento.</Text>
        ) : (
          projects.slice(0, 4).map(project => (
            <View key={project.id} style={styles.projectItem}>
              <View 
                style={[
                  styles.projectPriority,
                  { backgroundColor: getPriorityColor(project.priority) }
                ]} 
              />
              <View style={styles.projectContent}>
                <View style={styles.projectHeader}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <Text style={styles.projectProgress}>{calculateProjectProgress(project)}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${calculateProjectProgress(project)}%`,
                        backgroundColor: COLORS.primary[500]
                      }
                    ]}
                  />
                </View>
                <Text style={styles.projectDeadline}>
                  Prazo: {new Date(project.deadline).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: THEME.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginRight: THEME.spacing.md,
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  greeting: {
    fontSize: THEME.fontSize.xl,
    color: COLORS.gray[800],
  },
  date: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: THEME.fontSize.md,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    ...THEME.shadows.sm,
    marginBottom: THEME.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  cardNumber: {
    fontSize: THEME.fontSize.xl,
    color: COLORS.gray[800],
  },
  cardLabel: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[600],
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.gray[200],
    borderRadius: 2,
    marginTop: THEME.spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    color: COLORS.gray[800],
    flex: 1,
    marginLeft: THEME.spacing.sm,
  
  },
  seeAllText: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.primary[500],
    fontWeight: '500',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.gray[50],
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: THEME.spacing.sm,
  },
  alertText: {
    flex: 1,
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[700],
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  scheduleTime: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  timeText: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[600],
    marginLeft: 4,
  },
  scheduleContent: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  scheduleTitle: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[800],
  },
  projectItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[50],
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  projectPriority: {
    width: 4,
    borderRadius: 2,
    marginRight: THEME.spacing.md,
  },
  projectContent: {
    flex: 1,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  projectName: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[800],
    fontWeight: '500',
  },
  projectProgress: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[600],
  },
  projectDeadline: {
    fontSize: THEME.fontSize.xs,
    color: COLORS.gray[600],
    marginTop: THEME.spacing.sm,
  },
  emptyText: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[400],
    textAlign: 'center',
    paddingVertical: THEME.spacing.md,
  },
});