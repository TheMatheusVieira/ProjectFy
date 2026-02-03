import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, THEME } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import { Note, User, Project, RootStackParamList } from '../../types';
import { StackNavigationProp } from '@react-navigation/stack';
import uuid from 'react-native-uuid';

type AllNotesScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function AllNotesScreen() {
  const navigation = useNavigation<AllNotesScreenNavigationProp>();
  const [notes, setNotes] = useState<(Note & { projectName?: string })[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<(Note & { projectName?: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    filterNotes();
  }, [searchQuery, notes]);

  const loadData = async () => {
    if (!refreshing) setIsLoading(true);
    try {
      const currentUser = await StorageService.getCurrentUser();
      setUser(currentUser);
      
      const allNotes = await StorageService.getNotes();
      const allProjects = await StorageService.getProjects();
      setProjects(allProjects);
      
      const notesWithProjectNames = allNotes.map(note => {
        const project = allProjects.find(p => p.id === note.projectId);
        return {
          ...note,
          projectName: project ? project.name : 'Projeto Excluído'
        };
      });

      setNotes(notesWithProjectNames.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filterNotes = () => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = notes.filter(
      n => 
        n.title.toLowerCase().includes(query) || 
        n.content.toLowerCase().includes(query) ||
        n.projectName?.toLowerCase().includes(query)
    );
    setFilteredNotes(filtered);
  };

  const handleSaveNote = async () => {
    if (!selectedProjectId) {
      Alert.alert('Erro', 'Por favor, selecione um projeto.');
      return;
    }
    if (!noteTitle.trim() || !noteContent.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o título e o conteúdo.');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const note: Note = {
        id: editingNoteId || (uuid.v4() as string),
        projectId: selectedProjectId,
        userId: user?.id || '',
        title: noteTitle.trim(),
        content: noteContent.trim(),
        createdAt: editingNoteId ? notes.find(n => n.id === editingNoteId)?.createdAt || now : now,
        updatedAt: now,
      };

      await StorageService.saveNote(note);
      await loadData();
      closeModal();
      Alert.alert('Sucesso', editingNoteId ? 'Anotação atualizada!' : 'Anotação salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      Alert.alert('Erro', 'Não foi possível salvar a anotação.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setSelectedProjectId(note.projectId);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setModalVisible(true);
  };

  const openModal = () => {
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setNoteTitle('');
    setNoteContent('');
    setSelectedProjectId('');
    setEditingNoteId(null);
  };

  const renderNoteItem = ({ item }: { item: Note & { projectName?: string } }) => (
    <TouchableOpacity 
      style={styles.noteCard}
      onPress={() => handleEditNote(item)}
    >
      <View style={styles.noteHeader}>
        <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.projectBadge}>
          <Text style={styles.projectBadgeText}>{item.projectName}</Text>
        </View>
      </View>
      <Text style={styles.noteContent} numberOfLines={3}>{item.content}</Text>
      <View style={styles.noteFooter}>
        <Text style={styles.noteDate}>
          {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
      </View>
    </TouchableOpacity>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray[400]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar em todas as notas..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.carouselWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.carouselContainer}
          contentContainerStyle={styles.carouselContent}
        >
          {projects.map(project => (
            <TouchableOpacity 
              key={project.id}
              style={styles.projectCardButton}
              onPress={() => navigation.navigate('ProjectNotes', { projectId: project.id, projectName: project.name })}
            >
              <View style={[styles.projectIconContainer, { backgroundColor: COLORS.primary[50] }]}>
                <Ionicons name="folder-outline" size={18} color={COLORS.primary[500]} />
              </View>
              <Text style={styles.projectCardText} numberOfLines={1}>{project.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        renderItem={renderNoteItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.gray[200]} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Nenhuma anotação encontrada.' : 'Você ainda não tem anotações.'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={openModal}
      >
        <Ionicons name="add" size={30} color={COLORS.white} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingNoteId ? 'Editar anotação' : 'Nova anotação'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {!editingNoteId && (
                <>
                  <Text style={styles.label}>Projeto *</Text>
                  <View style={styles.projectSelector}>
                    {projects.map(project => (
                      <TouchableOpacity 
                        key={project.id}
                        style={[
                          styles.projectOption,
                          selectedProjectId === project.id && styles.projectOptionSelected
                        ]}
                        onPress={() => setSelectedProjectId(project.id)}
                      >
                        <Text style={[
                          styles.projectOptionText,
                          selectedProjectId === project.id && styles.projectOptionTextSelected
                        ]}>
                          {project.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

                <Text style={[styles.label, editingNoteId && { marginTop: 0 }]}>Título da anotação *</Text>
                <View style={[styles.inputContainer, { marginBottom: 12 }]}>
                  <Ionicons name="document-text-outline" size={20} color={COLORS.gray[400]} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Título da anotação"
                    value={noteTitle}
                    onChangeText={setNoteTitle}
                    placeholderTextColor={COLORS.gray[400]}
                  />
                </View>

                <Text style={styles.label}>Conteúdo *</Text>
                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                  <Ionicons name="reader-outline" size={20} color={COLORS.gray[400]} style={[styles.inputIcon, { marginTop: 12 }]} />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Escreva sua anotação aqui..."
                    value={noteContent}
                    onChangeText={setNoteContent}
                    multiline
                    placeholderTextColor={COLORS.gray[400]}
                  />
                </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[
                  styles.saveButton, 
                  (!selectedProjectId || !noteTitle.trim() || !noteContent.trim() || isSaving) && styles.saveButtonDisabled
                ]}
                onPress={handleSaveNote}
                disabled={!selectedProjectId || !noteTitle.trim() || !noteContent.trim() || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar Anotação</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.sm,
    height: 45,
  },
  carouselWrapper: {
    paddingVertical: THEME.spacing.sm,
    backgroundColor: COLORS.background,
  },
  carouselContainer: {
    paddingLeft: THEME.spacing.md,
  },
  carouselContent: {
    paddingRight: THEME.spacing.md,
    gap: 10,
  },
  projectCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    maxWidth: 200,
  },
  projectIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  projectCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  searchIcon: {
    marginRight: THEME.spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[800],
  },
  listContent: {
    padding: THEME.spacing.md,
  },
  noteCard: {
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.xs,
  },
  noteTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    flex: 1,
    marginRight: THEME.spacing.sm,
  },
  projectBadge: {
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  projectBadgeText: {
    fontSize: 10,
    color: COLORS.primary[600],
    fontWeight: '600',
  },
  noteContent: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[600],
    lineHeight: 20,
    marginBottom: THEME.spacing.sm,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[50],
    paddingTop: THEME.spacing.xs,
  },
  noteDate: {
    fontSize: THEME.fontSize.xs,
    color: COLORS.gray[400],
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
    paddingHorizontal: THEME.spacing.xl,
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
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  label: {
    fontSize: 13,
    color: COLORS.gray[600],
    marginBottom: 4,
    fontWeight: '600',
    marginTop: 8,
  },
  projectSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    marginTop: 8,
  },
  projectOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: COLORS.gray[100],
    backgroundColor: COLORS.gray[50],
  },
  projectOptionSelected: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  projectOptionText: {
    fontSize: 12,
    color: COLORS.gray[600],
  },
  projectOptionTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 4,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.gray[800],
  },
  textAreaContainer: {
    height: 150,
    alignItems: 'flex-start',
  },
  textArea: {
    height: '100%',
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: 16,
    backgroundColor: COLORS.white,
  },
  saveButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.gray[300],
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
