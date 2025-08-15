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

// Types
import { User, Project } from '../../types';
import { COLORS, THEME } from '../../constants/colors';

export default function ProjectsScreen(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed' | 'planning'>('all');

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
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const createSampleProject = async (): Promise<void> => {
    if (!user) return;

    try {
      const newProject: Project = {
        id: Date.now().toString(),
        name: `Projeto ${projects.length + 1}`,
        description: 'Descrição do projeto',
        progress: Math.floor(Math.random() * 100),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as Project['priority'],
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user.id,
        tasks: [],
      };

      // Carregar projetos existentes
      const projectsData = await AsyncStorage.getItem('projects');
      const allProjects: Project[] = projectsData ? JSON.parse(projectsData) : [];
      
      // Adicionar novo projeto
      allProjects.push(newProject);
      await AsyncStorage.setItem('projects', JSON.stringify(allProjects));
      
      // Atualizar estado local
      const userProjects = allProjects.filter(p => p.userId === user.id);
      setProjects(userProjects);

      Alert.alert('Sucesso', 'Projeto criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      Alert.alert('Erro', 'Erro ao criar projeto. Tente novamente.');
    }
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
            { key: 'in_progress', label: 'Em Andamento' },
            { key: 'planning', label: 'Planejamento' },
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
        
        <TouchableOpacity style={styles.addButton} onPress={createSampleProject}>
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
            <Text style={styles.emptyTitle}>Nenhum projeto encontrado</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'all' 
                ? 'Toque no botão + para criar seu primeiro projeto'
                : `Nenhum projeto ${getStatusLabel(filter as Project['status']).toLowerCase()}`
              }
            </Text>
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
  },
  emptySubtitle: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[500],
    textAlign: 'center',
    paddingHorizontal: THEME.spacing.xl,
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
  },
  deleteButton: {
    padding: THEME.spacing.sm,
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
  },
});