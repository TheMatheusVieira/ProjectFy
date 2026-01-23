import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { COLORS, THEME } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import { TimeLog, RootStackParamList, User, Project } from '../../types';
import { v4 as uuidv4 } from 'uuid';

type TimeTrackingScreenRouteProp = RouteProp<RootStackParamList, 'TimeTracking'>;

export default function TimeTrackingScreen() {
  const route = useRoute<TimeTrackingScreenRouteProp>();
  const navigation = useNavigation();
  const { projectId, projectName } = route.params;

  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Timer State
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualDescription, setManualDescription] = useState('');

  useEffect(() => {
    loadData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [projectId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await StorageService.getCurrentUser();
      setUser(currentUser);
      
      const projects = await StorageService.getProjects();
      const currentProject = projects.find(p => p.id === projectId);
      setProject(currentProject || null);

      const projectLogs = await StorageService.getProjectTimeLogs(projectId);
      setLogs(projectLogs.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()));
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTimer = () => {
    if (isActive) {
      // Parar timer
      if (timerRef.current) clearInterval(timerRef.current);
      setIsActive(false);
      handleSaveTimerLog();
    } else {
      // Iniciar timer
      setIsActive(true);
      timerRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }
  };

  const handleSaveTimerLog = () => {
    if (seconds < 60) {
      Alert.alert('Aviso', 'O tempo mínimo para registro é de 1 minuto.');
      setSeconds(0);
      return;
    }

    Alert.alert(
      'Salvar Registro',
      `Deseja salvar o registro de ${formatTime(seconds)}?`,
      [
        { text: 'Descartar', style: 'destructive', onPress: () => setSeconds(0) },
        {
          text: 'Salvar',
          onPress: () => {
            setModalVisible(true);
            setManualHours(Math.floor(seconds / 3600).toString());
            setManualMinutes(Math.floor((seconds % 3600) / 60).toString());
          }
        }
      ]
    );
  };

  const handleSaveLog = async () => {
    const h = parseInt(manualHours) || 0;
    const m = parseInt(manualMinutes) || 0;
    const totalSeconds = (h * 3600) + (m * 60);

    if (totalSeconds <= 0) {
      Alert.alert('Erro', 'Informe uma duração válida.');
      return;
    }

    if (!user) return;

    try {
      const log: TimeLog = {
        id: uuidv4(),
        projectId,
        userId: user.id,
        start: new Date().toISOString(),
        duration: totalSeconds,
        description: manualDescription.trim(),
        synced: false,
        updatedAt: new Date().toISOString(),
      };

      await StorageService.saveTimeLog(log);
      await loadData();
      setModalVisible(false);
      setSeconds(0);
      setManualHours('');
      setManualMinutes('');
      setManualDescription('');
    } catch (error) {
      console.error('Erro ao salvar log:', error);
      Alert.alert('Erro', 'Não foi possível salvar o registro.');
    }
  };

  const handleDeleteLog = (id: string) => {
    Alert.alert(
      'Excluir Registro',
      'Tem certeza que deseja remover este registro de tempo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteTimeLog(id);
              await loadData();
            } catch (error) {
              console.error('Erro ao excluir log:', error);
            }
          },
        },
      ]
    );
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderLogItem = ({ item }: { item: TimeLog }) => (
    <View style={styles.logCard}>
      <View style={styles.logInfo}>
        <Text style={styles.logDate}>
          {new Date(item.start).toLocaleDateString('pt-BR')}
        </Text>
        <Text style={styles.logDuration}>{formatTime(item.duration)}</Text>
        {item.description ? (
          <Text style={styles.logDesc} numberOfLines={1}>{item.description}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={() => handleDeleteLog(item.id)}>
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
      {/* Timer Section */}
      <View style={styles.timerSection}>
        <Text style={styles.timerLabel}>Tempo Ativo</Text>
        <Text style={styles.timerDisplay}>{formatTime(seconds)}</Text>
        <View style={styles.timerControls}>
          <TouchableOpacity 
            style={[styles.timerButton, isActive ? styles.stopButton : styles.startButton]}
            onPress={toggleTimer}
          >
            <Ionicons name={isActive ? "stop" : "play"} size={32} color={COLORS.white} />
            <Text style={styles.timerButtonText}>{isActive ? "Parar" : "Iniciar"}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.manualButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={24} color={COLORS.primary[500]} />
            <Text style={styles.manualButtonText}>Log Manual</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* History Section */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Histórico de Registros</Text>
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={48} color={COLORS.gray[200]} />
              <Text style={styles.emptyText}>Nenhum registro encontrado.</Text>
            </View>
          }
        />
      </View>

      {/* Manual Log Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Registro de Tempo</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Duração</Text>
              <View style={styles.durationInputRow}>
                <View style={styles.durationInputGroup}>
                  <TextInput
                    style={styles.input}
                    placeholder="00"
                    keyboardType="numeric"
                    value={manualHours}
                    onChangeText={setManualHours}
                  />
                  <Text style={styles.durationLabel}>Horas</Text>
                </View>
                <Text style={styles.durationSeparator}>:</Text>
                <View style={styles.durationInputGroup}>
                  <TextInput
                    style={styles.input}
                    placeholder="00"
                    keyboardType="numeric"
                    value={manualMinutes}
                    onChangeText={setManualMinutes}
                  />
                  <Text style={styles.durationLabel}>Minutos</Text>
                </View>
              </View>

              <Text style={styles.label}>Descrição (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="O que você fez neste período?"
                value={manualDescription}
                onChangeText={setManualDescription}
                multiline
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveLog}>
                <Text style={styles.saveButtonText}>Salvar Registro</Text>
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
  timerSection: {
    backgroundColor: COLORS.white,
    padding: THEME.spacing.xxl,
    alignItems: 'center',
    ...THEME.shadows.md,
  },
  timerLabel: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: THEME.spacing.sm,
  },
  timerDisplay: {
    fontSize: 64,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    fontVariant: ['tabular-nums'],
    marginBottom: THEME.spacing.xl,
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.xl,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    gap: THEME.spacing.sm,
    ...THEME.shadows.sm,
  },
  startButton: {
    backgroundColor: COLORS.primary[500],
  },
  stopButton: {
    backgroundColor: COLORS.error,
  },
  timerButtonText: {
    color: COLORS.white,
    fontSize: THEME.fontSize.lg,
    fontWeight: 'bold',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manualButtonText: {
    color: COLORS.primary[500],
    fontSize: THEME.fontSize.md,
    fontWeight: '500',
  },
  historySection: {
    flex: 1,
    padding: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: THEME.spacing.md,
  },
  listContent: {
    paddingBottom: 20,
  },
  logCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    alignItems: 'center',
    ...THEME.shadows.sm,
  },
  logInfo: {
    flex: 1,
  },
  logDate: {
    fontSize: THEME.fontSize.xs,
    color: COLORS.gray[500],
    marginBottom: 2,
  },
  logDuration: {
    fontSize: THEME.fontSize.lg,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  logDesc: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[400],
    marginTop: THEME.spacing.md,
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
    height: '70%',
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
  durationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  durationInputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  durationSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[400],
    marginHorizontal: THEME.spacing.sm,
    paddingBottom: 20,
  },
  durationLabel: {
    fontSize: 10,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  input: {
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[800],
    width: '100%',
    textAlign: 'center',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    textAlign: 'left',
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
  saveButtonText: {
    color: COLORS.white,
    fontSize: THEME.fontSize.lg,
    fontWeight: 'bold',
  },
});
