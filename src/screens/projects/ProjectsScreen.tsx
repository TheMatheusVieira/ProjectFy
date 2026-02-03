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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { COLORS, THEME } from '../../constants/colors';
import { Project, User, RootStackParamList } from '../../types';
import StorageService from '../../services/StorageService';
import { StackNavigationProp } from '@react-navigation/stack';

type ProjectsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

export default function ProjectsScreen(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectHours, setProjectHours] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed' | 'planning'>('all');

  const navigation = useNavigation<ProjectsScreenNavigationProp>();

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
      const currentUser = await StorageService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        
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
        
        console.log(`Carregados ${userProjects.length} projetos para o usuário ${currentUser.name}`);
      } else {
        console.log('Usuário não encontrado');
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
      await StorageService.deleteProject(projectId);
      await loadData();
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

  const calculateProjectProgress = (project: Project): number => {
    if (!project.estimatedHours || project.estimatedHours === 0) {
      return project.progress || 0;
    }
    const workedHours = (projectHours[project.id] || 0) / 3600;
    const progress = (workedHours / project.estimatedHours) * 100;
    return Math.min(Math.round(progress), 100);
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
          onPress={() => navigation.navigate('CreateProject')}
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
                onPress={() => navigation.navigate('CreateProject')}
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
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('ProjectPurchases', { projectId: project.id, projectName: project.name })}
                  >
                    <Ionicons name="cart-outline" size={20} color={COLORS.warning} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('TimeTracking', { projectId: project.id, projectName: project.name })}
                  >
                    <Ionicons name="time-outline" size={20} color={COLORS.gray[600]} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('ProjectAttachments', { projectId: project.id, projectName: project.name })}
                  >
                    <Ionicons name="attach-outline" size={20} color={COLORS.gray[500]} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('ProjectTasks', { projectId: project.id, projectName: project.name })}
                  >
                    <Ionicons name="list-outline" size={20} color={COLORS.accent[500]} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('ProjectNotes', { projectId: project.id, projectName: project.name })}
                  >
                    <Ionicons name="document-text-outline" size={20} color={COLORS.secondary[500]} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('CreateProject', { project })}
                  >
                    <Ionicons name="create-outline" size={20} color={COLORS.primary[500]} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => confirmDelete(project)}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
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
                <Text style={styles.progressText}>{calculateProjectProgress(project)}%</Text>
              </View>

              {/* Barra de Progresso */}
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${calculateProjectProgress(project)}%`,
                      backgroundColor: getStatusColor(project.status)
                    }
                  ]}
                />
              </View>

              {/* Informações adicionais */}
              <View style={styles.projectInfo}>
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={16} color={COLORS.gray[500]} />
                  <Text style={styles.infoText}>
                    {Math.floor((projectHours[project.id] || 0) / 3600)}h / {project.estimatedHours || 0}h
                  </Text>
                </View>
                
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
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: THEME.spacing.sm,
    marginLeft: THEME.spacing.xs,
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