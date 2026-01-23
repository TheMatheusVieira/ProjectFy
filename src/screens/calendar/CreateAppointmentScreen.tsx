import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS, THEME } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import { Appointment, Project, User, RootStackParamList } from '../../types';
import { v4 as uuidv4 } from 'uuid';

type CreateAppointmentScreenRouteProp = RouteProp<RootStackParamList, 'CreateAppointment'>;

export default function CreateAppointmentScreen() {
  const navigation = useNavigation();
  const route = useRoute<CreateAppointmentScreenRouteProp>();
  const editingAppointment = route.params?.appointment;
  const initialDate = route.params?.selectedDate || new Date().toISOString().split('T')[0];

  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState(editingAppointment?.title || '');
  const [description, setDescription] = useState(editingAppointment?.description || '');
  const [date, setDate] = useState(editingAppointment?.date || initialDate);
  const [time, setTime] = useState(editingAppointment?.time || '10:00');
  const [priority, setPriority] = useState<Appointment['priority']>(editingAppointment?.priority || 'medium');
  const [projectId, setProjectId] = useState<string | undefined>(editingAppointment?.projectId);
  const [status, setStatus] = useState<Appointment['status']>(editingAppointment?.status || 'scheduled');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await StorageService.getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        const userProjects = await StorageService.getUserProjects(currentUser.id);
        setProjects(userProjects);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !date || !time) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha o título, data e hora.');
      return;
    }

    if (!user) return;

    // Validar formato da data (AAAA-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      Alert.alert('Formato Inválido', 'Use o formato AAAA-MM-DD para a data.');
      return;
    }

    // Validar formato da hora (HH:mm)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(time)) {
      Alert.alert('Formato Inválido', 'Use o formato HH:mm para a hora.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const appointment: Appointment = {
        id: editingAppointment?.id || uuidv4(),
        userId: user.id,
        title: title.trim(),
        description: description.trim(),
        date,
        time,
        priority,
        status,
        projectId,
        createdAt: editingAppointment?.createdAt || now,
        updatedAt: now,
      };

      await StorageService.saveAppointment(appointment);
      Alert.alert('Sucesso', `Compromisso ${editingAppointment ? 'atualizado' : 'criado'} com sucesso!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      Alert.alert('Erro', 'Não foi possível salvar o compromisso.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Reunião de Briefing"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Detalhes do compromisso..."
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Data (AAAA-MM-DD) *</Text>
            <TextInput
              style={styles.input}
              placeholder="2024-12-31"
              value={date}
              onChangeText={setDate}
            />
          </View>
          <View style={{ width: 16 }} />
          <View style={styles.flex1}>
            <Text style={styles.label}>Hora (HH:mm) *</Text>
            <TextInput
              style={styles.input}
              placeholder="14:30"
              value={time}
              onChangeText={setTime}
            />
          </View>
        </View>

        <View style={styles.section}>
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
                  priority === opt.key && { backgroundColor: opt.color + '20', borderColor: opt.color }
                ]}
                onPress={() => setPriority(opt.key as any)}
              >
                <Text style={[styles.priorityOptionText, priority === opt.key && { color: opt.color }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Projeto Associado (Opcional)</Text>
          <View style={styles.projectSelector}>
            <TouchableOpacity
              style={[styles.projectOption, !projectId && styles.projectOptionActive]}
              onPress={() => setProjectId(undefined)}
            >
              <Text style={[styles.projectOptionText, !projectId && styles.projectOptionTextActive]}>Nenhum</Text>
            </TouchableOpacity>
            {projects.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.projectOption, projectId === p.id && styles.projectOptionActive]}
                onPress={() => setProjectId(p.id)}
              >
                <Text style={[styles.projectOptionText, projectId === p.id && styles.projectOptionTextActive]} numberOfLines={1}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {editingAppointment && (
          <View style={styles.section}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusSelector}>
              {[
                { key: 'scheduled', label: 'Agendado' },
                { key: 'done', label: 'Concluído' },
                { key: 'canceled', label: 'Cancelado' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.statusOption, status === opt.key && styles.statusOptionActive]}
                  onPress={() => setStatus(opt.key as any)}
                >
                  <Text style={[styles.statusOptionText, status === opt.key && styles.statusOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            {editingAppointment ? 'Atualizar Compromisso' : 'Salvar Compromisso'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: THEME.spacing.lg,
  },
  section: {
    marginBottom: THEME.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    marginBottom: THEME.spacing.lg,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: THEME.fontSize.sm,
    fontWeight: 'bold',
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[800],
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
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
  projectSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
  },
  projectOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  projectOptionActive: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  projectOptionText: {
    fontSize: 12,
    color: COLORS.gray[600],
  },
  projectOptionTextActive: {
    color: COLORS.white,
    fontWeight: '500',
  },
  statusSelector: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  statusOption: {
    flex: 1,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  statusOptionActive: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  statusOptionText: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[600],
  },
  statusOptionTextActive: {
    color: COLORS.white,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: THEME.borderRadius.md,
    paddingVertical: THEME.spacing.lg,
    alignItems: 'center',
    marginTop: THEME.spacing.xl,
    marginBottom: THEME.spacing.xxl,
    ...THEME.shadows.md,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: THEME.fontSize.lg,
    fontWeight: 'bold',
  },
});
