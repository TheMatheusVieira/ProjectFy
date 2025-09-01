import React, { useState, useEffect, JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

// Types (assumindo que estão definidos em outro arquivo)
type User = {
  id: string;
  name: string;
  email: string;
};

type Project = {
  id: string;
  name: string;
  description: string;
  progress: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  createdAt: string;
  updatedAt: string;
  userId: string;
  tasks: [];
  // Campos opcionais
  company?: string;
  estimatedHours?: number;
  team?: Array<{id: string; name: string; role: string}>;
};

// Cores (assumindo estrutura similar)
const COLORS = {
  background: '#F9FAFB',
  white: '#FFFFFF',
  primary: { 500: '#3B82F6' },
  accent: { 500: '#8B5CF6' },
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gray: {
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
  },
};

const THEME = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
  },
  borderRadius: {
    sm: 4,
    lg: 12,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
  },
};

export default function ProjectsScreen(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed' | 'planning'>('all');

  const navigation = useNavigation();

  // Carrega dados quando a tela ganha foco (ao voltar de outras telas)
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
      const currentUserData = await AsyncStorage.getItem('currentUser');
      if (currentUserData) {
        const userData: User = JSON.parse(currentUserData);
        setUser(userData);
        
        // Carregar projetos do usuário
        const projectsData = await AsyncStorage.getItem('projects');
        const allProjects: Project[] = projectsData ? JSON.parse(projectsData) : [];
        const userProjects = allProjects.filter(p => p.userId === userData.id);
        setProjects(userProjects);
        
        console.log(`Carregados ${userProjects.length} projetos para o usuário ${userData.name}`);
      } else {
        console.log('Usuário não encontrado no AsyncStorage');
        Alert.alert('Sessão Expirada', 'Faça login novamente.', [
          {
            text: 'OK',
            onPress: () => {
              // Navegar para tela de login se necessário
              // navigation.navigate('Login');
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      Alert.alert('Erro', 'Erro ao carregar projetos. Tente novamente.');
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    try {
      // Carregar projetos existentes
      const projectsData = await AsyncStorage.getItem('projects');
      const allProjects: Project[] = projectsData ? JSON.parse(projectsData) : [];
      
      // Remover projeto
      const updatedProjects = allProjects.filter(p => p.id !== projectId);
      await AsyncStorage.setItem('projects', JSON.stringify(updatedProjects));
      
      // Atualizar estado local
      const userProjects = updatedProjects.filter(p => p.userId === user?.id);
      setProjects(userProjects);

      Alert.alert('Sucesso', 'Projeto excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      Alert.alert('Erro', 'Erro ao excluir projeto. Tente novamente.');
    }
  };

  const confirmDelete = (project: Project): void => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir o projeto "${project.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteProject(project.id) }
      ]
    );
  };

  const getFilteredProjects = (): Project[] => {
    if (filter === 'all') return projects;
    return projects.filter(p => p.status === filter);
  };

  const getPriorityColor = (priority: Project['priority']): string => {
    switch (priority) {
      case 'high': return COLORS.error;
      case 'medium': return COLORS.warning;
      default: return COLORS.success;
    }
  };

  const getStatusColor = (status: Project['status']): string => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'in_progress': return COLORS.primary[500];
      case 'planning': return COLORS.accent[500];
      default: return COLORS.gray[400];
    }
  };

  const getStatusLabel = (status: Project['status']): string => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'in_progress': return 'Em Andamento';
      case 'planning': return 'Planejamento';
      case 'on_hold': return 'Pausado';
      default: return 'Desconhecido';
    }
  };

  const filteredProjects = getFilteredProjects();

  return (
    <View style={styles.container}>
      {/* Header com filtros */}
      <View style={styles.header}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'planning', label: 'Planejamento' },
            { key: 'in_progress', label: 'Em Andamento' },
            { key: 'completed', label: 'Concluídos' },
          ].map(filterOption => (
            <TouchableOpacity
              key={filterOption.key}
              style={[
                styles.filterButton,
                filter === filterOption.key && styles.filterButtonActive
              ]}
              onPress={() => setFilter(filterOption.key as typeof filter)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === filterOption.key && styles.filterButtonTextActive
              ]}>
                {filterOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <TouchableOpacity 
          style={styles.addButton}  
          onPress={() => (navigation as any).navigate('CreateProject')}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Lista de Projetos */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredProjects.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-outline" size={64} color={COLORS.gray[300]} />
            <Text style={styles.emptyTitle}>
              {filter === 'all' ? 'Nenhum projeto encontrado' : `Nenhum projeto ${getStatusLabel(filter as Project['status']).toLowerCase()}`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'all' 
                ? 'Toque no botão + para criar seu primeiro projeto'
                : `Você não possui projetos com status "${getStatusLabel(filter as Project['status']).toLowerCase()}"`
              }
            </Text>
            {filter === 'all' && (
              <TouchableOpacity 
                style={styles.createFirstProjectButton}
                onPress={() => (navigation as any).navigate('CreateProject')}
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
                <Text style={styles.createFirstProjectText}>Criar Primeiro Projeto</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredProjects.map(project => (
            <View key={project.id} style={styles.projectCard}>
              {/* Header do Card */}
              <View style={styles.projectHeader}>
                <View style={styles.projectTitleRow}>
                  <View 
                    style={[
                      styles.priorityIndicator,
                      { backgroundColor: getPriorityColor(project.priority) }
                    ]} 
                  />
                  <Text style={styles.projectName}>{project.name}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => confirmDelete(project)}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>

              {/* Empresa (se existir) */}
              {project.company && (
                <Text style={styles.projectCompany}>{project.company}</Text>
              )}

              {/* Descrição */}
              {project.description && (
                <Text style={styles.projectDescription} numberOfLines={2}>
                  {project.description}
                </Text>
              )}

              {/* Status e Progresso */}
              <View style={styles.statusRow}>
                <View style={styles.statusBadge}>
                  <View 
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(project.status) }
                    ]} 
                  />
                  <Text style={styles.statusText}>{getStatusLabel(project.status)}</Text>
                </View>
                <Text style={styles.progressText}>{project.progress}%</Text>
              </View>

              {/* Barra de Progresso */}
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${project.progress}%`,
                      backgroundColor: getStatusColor(project.status)
                    }
                  ]}
                />
              </View>

              {/* Informações adicionais */}
              <View style={styles.projectInfo}>
                {project.estimatedHours && project.estimatedHours > 0 && (
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={16} color={COLORS.gray[500]} />
                    <Text style={styles.infoText}>{project.estimatedHours}h estimadas</Text>
                  </View>
                )}
                
                {project.team && project.team.length > 0 && (
                  <View style={styles.infoItem}>
                    <Ionicons name="people-outline" size={16} color={COLORS.gray[500]} />
                    <Text style={styles.infoText}>{project.team.length} membro(s)</Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={styles.projectFooter}>
                <View style={styles.deadlineContainer}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.gray[500]} />
                  <Text style={styles.deadlineText}>
                    {new Date(project.deadline).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <View style={styles.priorityContainer}>
                  <Text style={[
                    styles.priorityText,
                    { color: getPriorityColor(project.priority) }
                  ]}>
                    {project.priority === 'high' && 'Alta'}
                    {project.priority === 'medium' && 'Média'}
                    {project.priority === 'low' && 'Baixa'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...THEME.shadows.sm,
  },
  filtersContainer: {
    flex: 1,
    marginRight: THEME.spacing.md,
  },
  filterButton: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    marginRight: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: COLORS.gray[100],
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary[500],
  },
  filterButtonText: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[600],
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: THEME.spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.xxl,
  },
  emptyTitle: {
    fontSize: THEME.fontSize.lg,
    color: COLORS.gray[600],
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[500],
    textAlign: 'center',
    paddingHorizontal: THEME.spacing.xl,
    marginBottom: THEME.spacing.lg,
  },
  createFirstProjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    gap: THEME.spacing.sm,
  },
  createFirstProjectText: {
    color: COLORS.white,
    fontSize: THEME.fontSize.md,
    fontWeight: '500',
  },
  projectCard: {
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.sm,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priorityIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: THEME.spacing.sm,
  },
  projectName: {
    fontSize: THEME.fontSize.lg,
    color: COLORS.gray[800],
    flex: 1,
    fontWeight: '600',
  },
  deleteButton: {
    padding: THEME.spacing.sm,
  },
  projectCompany: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[500],
    marginBottom: THEME.spacing.xs,
    fontStyle: 'italic',
  },
  projectDescription: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[600],
    lineHeight: 20,
    marginBottom: THEME.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: THEME.spacing.xs,
  },
  statusText: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[600],
  },
  progressText: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.gray[200],
    borderRadius: 3,
    marginBottom: THEME.spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  projectInfo: {
    flexDirection: 'row',
    marginBottom: THEME.spacing.md,
    gap: THEME.spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: THEME.fontSize.xs,
    color: COLORS.gray[600],
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineText: {
    fontSize: THEME.fontSize.xs,
    color: COLORS.gray[600],
    marginLeft: 4,
  },
  priorityContainer: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: COLORS.gray[100],
  },
  priorityText: {
    fontSize: THEME.fontSize.xs,
    fontWeight: '500',
  },
});