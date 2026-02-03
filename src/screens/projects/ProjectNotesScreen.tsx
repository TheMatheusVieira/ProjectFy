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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { COLORS, THEME } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import { Note, RootStackParamList, User } from '../../types';
import uuid from 'react-native-uuid';

type ProjectNotesScreenRouteProp = RouteProp<RootStackParamList, 'ProjectNotes'>;

export default function ProjectNotesScreen() {
  const route = useRoute<ProjectNotesScreenRouteProp>();
  const navigation = useNavigation();
  const { projectId, projectName } = route.params;

  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    loadData();
  }, [projectId]);

  useEffect(() => {
    filterNotes();
  }, [searchQuery, notes]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await StorageService.getCurrentUser();
      setUser(currentUser);
      
      const projectNotes = await StorageService.getProjectNotes(projectId);
      setNotes(projectNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as anotações.');
    } finally {
      setIsLoading(false);
    }
  };

  const filterNotes = () => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = notes.filter(
      n => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
    );
    setFilteredNotes(filtered);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha o título e o conteúdo.');
      return;
    }

    if (!user) return;

    try {
      const now = new Date().toISOString();
      const note: Note = {
        id: editingNote?.id || uuid.v4() as string,
        projectId,
        userId: user.id,
        title: noteTitle.trim(),
        content: noteContent.trim(),
        createdAt: editingNote?.createdAt || now,
        updatedAt: now,
      };

      await StorageService.saveNote(note);
      await loadData();
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      Alert.alert('Erro', 'Não foi possível salvar a anotação.');
    }
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert(
      'Excluir Anotação',
      'Tem certeza que deseja excluir esta anotação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteNote(noteId);
              await loadData();
            } catch (error) {
              console.error('Erro ao excluir nota:', error);
              Alert.alert('Erro', 'Não foi possível excluir a anotação.');
            }
          },
        },
      ]
    );
  };

  const openModal = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setNoteTitle(note.title);
      setNoteContent(note.content);
    } else {
      setEditingNote(null);
      setNoteTitle('');
      setNoteContent('');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
  };

  const renderNoteItem = ({ item }: { item: Note }) => (
    <TouchableOpacity 
      style={styles.noteCard}
      onPress={() => openModal(item)}
    >
      <View style={styles.noteHeader}>
        <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
        <TouchableOpacity onPress={() => handleDeleteNote(item.id)}>
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>
      <Text style={styles.noteContent} numberOfLines={3}>{item.content}</Text>
      <Text style={styles.noteDate}>
        Atualizado em {new Date(item.updatedAt).toLocaleDateString('pt-BR')}
      </Text>
    </TouchableOpacity>
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
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.gray[400]} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar anotações..."
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

      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id}
        renderItem={renderNoteItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.gray[200]} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Nenhuma anotação encontrada.' : 'Nenhuma anotação para este projeto.'}
            </Text>
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
                {editingNote ? 'Editar Anotação' : 'Nova Anotação'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TextInput
                style={styles.titleInput}
                placeholder="Título"
                value={noteTitle}
                onChangeText={setNoteTitle}
                placeholderTextColor={COLORS.gray[400]}
              />
              <TextInput
                style={styles.contentInput}
                placeholder="Comece a escrever..."
                value={noteContent}
                onChangeText={setNoteContent}
                multiline
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.saveButton, (!noteTitle.trim() || !noteContent.trim()) && styles.saveButtonDisabled]}
                onPress={handleSaveNote}
                disabled={!noteTitle.trim() || !noteContent.trim()}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.sm,
    height: 45,
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
    paddingBottom: 100,
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
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  noteTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    flex: 1,
    marginRight: THEME.spacing.sm,
  },
  noteContent: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[600],
    lineHeight: 22,
    marginBottom: THEME.spacing.sm,
  },
  noteDate: {
    fontSize: THEME.fontSize.xs,
    color: COLORS.gray[400],
    textAlign: 'right',
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
    height: '85%',
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
    flex: 1,
    padding: THEME.spacing.lg,
  },
  titleInput: {
    fontSize: THEME.fontSize.xl,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: THEME.spacing.md,
  },
  contentInput: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[700],
    lineHeight: 24,
    flex: 1,
    textAlignVertical: 'top',
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
