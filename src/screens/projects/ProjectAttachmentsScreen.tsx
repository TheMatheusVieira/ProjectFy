import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { COLORS, THEME } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import { Attachment, RootStackParamList, Project } from '../../types';

type ProjectAttachmentsScreenRouteProp = RouteProp<RootStackParamList, 'ProjectAttachments'>;

export default function ProjectAttachmentsScreen() {
  const route = useRoute<ProjectAttachmentsScreenRouteProp>();
  const navigation = useNavigation();
  const { projectId, projectName } = route.params;

  const [project, setProject] = useState<Project | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const projects = await StorageService.getProjects();
      const currentProject = projects.find(p => p.id === projectId);
      if (currentProject) {
        setProject(currentProject);
        setAttachments(currentProject.attachments || []);
      }
    } catch (error) {
      console.error('Erro ao carregar anexos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os anexos.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePickDocument = async () => {
    setIsPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await StorageService.saveAttachment(
          projectId,
          asset.uri,
          asset.name,
          asset.mimeType || 'application/octet-stream',
          asset.size || 0
        );
        await loadData();
      }
    } catch (error) {
      console.error('Erro ao selecionar documento:', error);
      Alert.alert('Erro', 'Não foi possível anexar o documento.');
    } finally {
      setIsPicking(false);
    }
  };

  const handleViewAttachment = async (attachment: Attachment) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(attachment.uri, {
          mimeType: attachment.type,
          dialogTitle: `Visualizar ${attachment.name}`,
        });
      } else {
        Alert.alert('Erro', 'O compartilhamento/visualização não está disponível neste dispositivo.');
      }
    } catch (error) {
      console.error('Erro ao visualizar anexo:', error);
      Alert.alert('Erro', 'Não foi possível abrir o arquivo.');
    }
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    Alert.alert(
      'Excluir Anexo',
      'Tem certeza que deseja remover este anexo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteAttachment(projectId, attachmentId);
              await loadData();
            } catch (error) {
              console.error('Erro ao excluir anexo:', error);
              Alert.alert('Erro', 'Não foi possível excluir o anexo.');
            }
          },
        },
      ]
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return 'image-outline';
    if (type.includes('pdf')) return 'document-outline';
    return 'attach-outline';
  };

  const renderAttachmentItem = ({ item }: { item: Attachment }) => (
    <TouchableOpacity 
      style={styles.attachmentCard}
      onPress={() => handleViewAttachment(item)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={getFileIcon(item.type)} size={32} color={COLORS.primary[500]} />
      </View>
      <View style={styles.attachmentInfo}>
        <Text style={styles.attachmentName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.attachmentMeta}>
          {formatSize(item.size)} • {new Date(item.createdAt).toLocaleDateString('pt-BR')}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeleteAttachment(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
      </TouchableOpacity>
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
      <FlatList
        data={attachments}
        keyExtractor={(item) => item.id}
        renderItem={renderAttachmentItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="attach-outline" size={64} color={COLORS.gray[200]} />
            <Text style={styles.emptyText}>Nenhum anexo para este projeto.</Text>
            <Text style={styles.emptySubtext}>Toque no botão abaixo para adicionar imagens ou PDFs.</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={[styles.fab, isPicking && styles.fabDisabled]}
        onPress={handlePickDocument}
        disabled={isPicking}
      >
        {isPicking ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Ionicons name="add" size={30} color={COLORS.white} />
        )}
      </TouchableOpacity>
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
    paddingBottom: 100,
  },
  attachmentCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    alignItems: 'center',
    ...THEME.shadows.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: THEME.fontSize.md,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  attachmentMeta: {
    fontSize: THEME.fontSize.xs,
    color: COLORS.gray[500],
  },
  deleteButton: {
    padding: THEME.spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: THEME.spacing.xl,
  },
  emptyText: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[400],
    marginTop: THEME.spacing.md,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[400],
    textAlign: 'center',
    marginTop: 8,
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
  fabDisabled: {
    backgroundColor: COLORS.gray[300],
  },
});
