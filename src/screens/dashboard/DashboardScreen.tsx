import React, { useState, useEffect, JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
import { User, Project, ScheduleEvent, Alert } from '../../types';
import { COLORS, THEME } from '../../constants/colors';

export default function DashboardScreen(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentTime] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      // Carregar usuário atual
      const currentUserData = await AsyncStorage.getItem('currentUser');
      if (currentUserData) {
        const userData: User = JSON.parse(currentUserData);
        setUser(userData);
        
        // Carregar projetos do usuário
        const projectsData = await AsyncStorage.getItem('projects');
        const allProjects: Project[] = projectsData ? JSON.parse(projectsData) : [];
        const userProjects = allProjects.filter(p => p.userId === userData.id);
        setProjects(userProjects);
      }

      // Carregar agenda (mock data por enquanto)
      setTodaySchedule([
        {
          id: '1',
          title: 'Reunião equipe - Sistema Web',
          startTime: '09:00',
          endTime: '10:00',
          type: 'meeting',
          userId: user?.id || '',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Review código - App Mobile',
          startTime: '14:00',
          endTime: '15:00',
          type: 'review',
          userId: user?.id || '',
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          title: 'Entrega módulo dashboard',
          startTime: '16:30',
          endTime: '17:00',
          type: 'deadline',
          userId: user?.id || '',
          createdAt: new Date().toISOString(),
        },
      ]);

      // Carregar alertas (mock data por enquanto)
      setAlerts([
        {
          id: '1',
          message: 'Deadline do projeto Sistema Web em 3 dias',
          type: 'warning',
          read: false,
          userId: user?.id || '',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          message: 'Nova tarefa atribuída no App Mobile',
          type: 'info',
          read: false,
          userId: user?.id || '',
          createdAt: new Date().toISOString(),
        },
      ]);
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

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      Header
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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Cards de resumo */}
      <View style={styles.summaryCards}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="folder-outline" size={24} color={COLORS.primary[500]} />
            <Text style={styles.cardNumber}>{projects.length}</Text>
          </View>
          <Text style={styles.cardLabel}>Projetos Ativos</Text>
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

      {/* Alertas */}
      {/* {alerts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.warning} />
            <Text style={styles.sectionTitle}>Alertas</Text>
          </View>
          {alerts.map(alert => (
            <View key={alert.id} style={styles.alertItem}>
              <View style={[styles.alertDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.alertText}>{alert.message}</Text>
            </View>
          ))}
        </View>
      )} */}

      {/* Agenda do Dia */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.secondary[500]} />
          <Text style={styles.sectionTitle}>Agenda de Hoje</Text>
          <Ionicons name="chevron-forward-outline" size={16} color={COLORS.gray[400]} />
        </View>
        {todaySchedule.map((event) => (
          <View key={event.id} style={styles.scheduleItem}>
            <View style={styles.scheduleTime}>
              <Ionicons 
                name={getEventIcon(event.type)} 
                size={16} 
                color={COLORS.gray[500]} 
              />
              <Text style={styles.timeText}>{event.startTime}</Text>
            </View>
            <View style={styles.scheduleContent}>
              <Text style={styles.scheduleTitle}>{event.title}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Projetos em Andamento */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meus Projetos</Text>
          <TouchableOpacity>
            <Ionicons name="add-outline" size={20} color={COLORS.primary[500]} />
          </TouchableOpacity>
        </View>
        {projects.slice(0, 4).map(project => (
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
                <Text style={styles.projectProgress}>{project.progress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${project.progress}%`,
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
        ))}
      </View>

      {/* Configuração de Trabalho */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuração de Trabalho</Text>
        <View style={styles.workConfigRow}>
          <View style={styles.workConfigItem}>
            <Text style={styles.workConfigNumber}>{user.weeklyHours}h</Text>
            <Text style={styles.workConfigLabel}>Horas/Semana</Text>
          </View>
          <View style={styles.workConfigItem}>
            <Text style={styles.workConfigNumber}>{user.dailyHours}h</Text>
            <Text style={styles.workConfigLabel}>Horas/Dia</Text>
          </View>
        </View>
      </View> */}



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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: THEME.fontSize.lg,
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
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.accent[50],
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
  workConfigRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  workConfigItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
  workConfigNumber: {
    fontSize: THEME.fontSize.xl,
    color: COLORS.primary[600],
    marginBottom: 4,
  },
  workConfigLabel: {
    fontSize: THEME.fontSize.xs,
    color: COLORS.gray[600],
  },
});