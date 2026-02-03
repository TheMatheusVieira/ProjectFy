import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { COLORS, THEME } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import { Task, RootStackParamList, User, Project } from '../../types';
import uuid from 'react-native-uuid';

type ProjectTasksScreenRouteProp = RouteProp<RootStackParamList, 'ProjectTasks'>;

export default function ProjectTasksScreen() {
  const route = useRoute<ProjectTasksScreenRouteProp>();
  const navigation = useNavigation();
  const { projectId, projectName } = route.params;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
    applyFilters();
  }, [filter, tasks]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await StorageService.getCurrentUser();
      setUser(currentUser);
      
      const projects = await StorageService.getProjects();
      const currentProject = projects.find(p => p.id === projectId);
      setProject(currentProject || null);

      const projectTasks = await StorageService.getProjectTasks(projectId);
      setTasks(projectTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }));
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as tarefas.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = tasks;
    if (filter === 'pending') filtered = tasks.filter(t => !t.completed);
    if (filter === 'completed') filtered = tasks.filter(t => t.completed);
    setFilteredTasks(filtered);
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, preencha o título da tarefa.');
      return;
    }

    if (!user) return;

    try {
      const now = new Date().toISOString();
      const task: Task = {
        id: editingTask?.id || uuid.v4() as string,
        projectId,
        userId: user.id,
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        completed: editingTask?.completed || false,
        priority: taskPriority,
        dueDate: taskDueDate || undefined,
        assignedTo: taskAssignedTo,
        createdAt: editingTask?.createdAt || now,
        updatedAt: now,
      };

      await StorageService.saveTask(task);
      await loadData();
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      Alert.alert('Erro', 'Não foi possível salvar a tarefa.');
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const updatedTask = { ...task, completed: !task.completed, updatedAt: new Date().toISOString() };
      await StorageService.saveTask(updatedTask);
      
      // Atualizar progresso do projeto (opcional, mas recomendado)
      await updateProjectProgress();
      
      await loadData();
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
    }
  };

  const updateProjectProgress = async () => {
    if (!project) return;
    const allTasks = await StorageService.getProjectTasks(projectId);
    if (allTasks.length === 0) return;
    
    const completedTasks = allTasks.filter(t => t.completed).length;
    const progress = Math.round((completedTasks / allTasks.length) * 100);
    
    const updatedProject = { ...project, progress, updatedAt: new Date().toISOString() };
    await StorageService.saveProject(updatedProject);
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert(
      'Excluir Tarefa',
      'Tem certeza que deseja excluir esta tarefa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteTask(taskId);
              await updateProjectProgress();
              await loadData();
            } catch (error) {
              console.error('Erro ao excluir tarefa:', error);
            }
          },
        },
      ]
    );
  };

  const openModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskTitle(task.title);
      setTaskDescription(task.description || '');
      setTaskPriority(task.priority);
      setTaskDueDate(task.dueDate || '');
      setTaskAssignedTo(task.assignedTo);
    } else {
      setEditingTask(null);
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('medium');
      setTaskDueDate('');
      setTaskAssignedTo(undefined);
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingTask(null);
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return COLORS.error;
      case 'medium': return COLORS.warning;
      default: return COLORS.success;
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={[styles.taskCard, item.completed && styles.completedCard]}>
      <TouchableOpacity 
        style={styles.checkbox} 
        onPress={() => handleToggleComplete(item)}
      >
        <Ionicons 
          name={item.completed ? "checkbox" : "square-outline"} 
          size={24} 
          color={item.completed ? COLORS.primary[500] : COLORS.gray[400]} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.taskInfo} 
        onPress={() => openModal(item)}
      >
        <Text style={[styles.taskTitle, item.completed && styles.completedText]}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={styles.taskDescription} numberOfLines={1}>{item.description}</Text>
        ) : null}
        <View style={styles.taskFooter}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
              {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
            </Text>
          </View>
          {item.dueDate && (
            <View style={styles.dueDateContainer}>
              <Ionicons name="calendar-outline" size={12} color={COLORS.gray[500]} />
              <Text style={styles.dueDateText}>{new Date(item.dueDate).toLocaleDateString('pt-BR')}</Text>
            </View>
          )}
          {item.assignedTo && project?.team && (
            <View style={styles.assignedContainer}>
              <Ionicons name="person-outline" size={12} color={COLORS.gray[500]} />
              <Text style={styles.assignedText}>
                {project.team.find(m => m.id === item.assignedTo)?.name || 'Membro'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => handleDeleteTask(item.id)}>
        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          {[
            { key: 'all', label: 'Todas' },
            { key: 'pending', label: 'Pendentes' },
            { key: 'completed', label: 'Concluídas' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterButton, filter === opt.key && styles.filterButtonActive]}
              onPress={() => setFilter(opt.key as any)}
            >
              <Text style={[styles.filterButtonText, filter === opt.key && styles.filterButtonTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={64} color={COLORS.gray[200]} />
            <Text style={styles.emptyText}>Nenhuma tarefa encontrada.</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => openModal()}
      >
        <Ionicons name="add" size={30} color={COLORS.white} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Desenvolver tela de login"
                value={taskTitle}
                onChangeText={setTaskTitle}
              />

              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Detalhes da tarefa..."
                value={taskDescription}
                onChangeText={setTaskDescription}
                multiline
              />

              <Text style={styles.label}>Prioridade</Text>
              <View style={styles.prioritySelector}>
                {[
                  { key: 'low', label: 'Baixa', color: COLORS.success },
                  { key: 'medium', label: 'Média', color: COLORS.warning },
                  { key: 'high', label: 'Alta', color: COLORS.error },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.priorityOption,
                      taskPriority === opt.key && { backgroundColor: opt.color + '20', borderColor: opt.color }
                    ]}
                    onPress={() => setTaskPriority(opt.key as any)}
                  >
                    <Text style={[styles.priorityOptionText, taskPriority === opt.key && { color: opt.color }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Prazo (AAAA-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2024-12-31"
                value={taskDueDate}
                onChangeText={setTaskDueDate}
              />

              {project?.team && project.team.length > 0 && (
                <>
                  <Text style={styles.label}>Atribuir a</Text>
                  <View style={styles.teamSelector}>
                    <TouchableOpacity
                      style={[styles.teamOption, !taskAssignedTo && styles.teamOptionActive]}
                      onPress={() => setTaskAssignedTo(undefined)}
                    >
                      <Text style={[styles.teamOptionText, !taskAssignedTo && styles.teamOptionTextActive]}>Ninguém</Text>
                    </TouchableOpacity>
                    {project.team.map(member => (
                      <TouchableOpacity
                        key={member.id}
                        style={[styles.teamOption, taskAssignedTo === member.id && styles.teamOptionActive]}
                        onPress={() => setTaskAssignedTo(member.id)}
                      >
                        <Text style={[styles.teamOptionText, taskAssignedTo === member.id && styles.teamOptionTextActive]}>
                          {member.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.saveButton, !taskTitle.trim() && styles.saveButtonDisabled]}
                onPress={handleSaveTask}
                disabled={!taskTitle.trim()}
              >
                <Text style={styles.saveButtonText}>Salvar Tarefa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  header: {
    padding: THEME.spacing.md,
    backgroundColor: COLORS.white,
    ...THEME.shadows.sm,
  },
  filtersContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    marginRight: THEME.spacing.sm,
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
    fontWeight: '500',
  },
  listContent: {
    padding: THEME.spacing.md,
    paddingBottom: 100,
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    alignItems: 'center',
    ...THEME.shadows.sm,
  },
  completedCard: {
    opacity: 0.6,
  },
  checkbox: {
    marginRight: THEME.spacing.md,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: COLORS.gray[400],
  },
  taskDescription: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[500],
    marginBottom: THEME.spacing.xs,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 10,
    color: COLORS.gray[500],
  },
  assignedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignedText: {
    fontSize: 10,
    color: COLORS.gray[500],
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
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.shadows.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    height: '90%',
    ...THEME.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  modalBody: {
    padding: THEME.spacing.lg,
  },
  label: {
    fontSize: THEME.fontSize.sm,
    fontWeight: 'bold',
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[800],
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  priorityOptionText: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[600],
  },
  teamSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.xl,
  },
  teamOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  teamOptionActive: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  teamOptionText: {
    fontSize: 12,
    color: COLORS.gray[600],
  },
  teamOptionTextActive: {
    color: COLORS.white,
    fontWeight: '500',
  },
  modalFooter: {
    padding: THEME.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  saveButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: THEME.borderRadius.md,
    paddingVertical: THEME.spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: THEME.fontSize.lg,
    fontWeight: 'bold',
  },
});
