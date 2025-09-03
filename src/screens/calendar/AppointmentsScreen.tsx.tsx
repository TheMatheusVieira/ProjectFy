import React, { useState, useEffect, useCallback, JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, THEME } from '../../constants/colors';
import { User } from '../../types';

// Tipos locais 
type Priority = 'low' | 'medium' | 'high';
type Status = 'scheduled' | 'done' | 'canceled';

interface Appointment {
  id: string;
  title: string;
  description?: string;
  date: string;   // AAAA-MM-DD
  time: string;   // HH:mm
  priority: Priority;
  status: Status;
  userId: string;
}

export default function AppointmentsScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | Status>('all');

  // helper para garantir que o array do storage está “limpo”
  const sanitize = (arr: any[]): Appointment[] =>
    (Array.isArray(arr) ? arr : [])
      .filter((x) => x && typeof x === 'object')
      .filter((x) => typeof x.id === 'string' && typeof x.userId === 'string');

  const loadAppointments = async (): Promise<void> => {
    try {
      const currentUserData = await AsyncStorage.getItem('currentUser');
      if (!currentUserData) {
        Alert.alert('Sessão Expirada', 'Faça login novamente.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }

      const userData: User = JSON.parse(currentUserData);
      setUser(userData);

      const stored = await AsyncStorage.getItem('appointments');
      const allAppointmentsRaw = stored ? JSON.parse(stored) : [];
      const allAppointments = sanitize(allAppointmentsRaw);

      // mantém o storage limpo se havia registros inválidos/null
      if (allAppointmentsRaw?.length !== allAppointments.length) {
        await AsyncStorage.setItem('appointments', JSON.stringify(allAppointments));
      }

      const userAppointments = allAppointments.filter((a) => a.userId === userData.id);
      setAppointments(userAppointments);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      Alert.alert('Erro', 'Erro ao carregar agendamentos. Tente novamente.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [])
  );

  useEffect(() => {
    loadAppointments();
  }, []);

  const deleteAppointment = async (id: string): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem('appointments');
      const allAppointments = sanitize(stored ? JSON.parse(stored) : []);

      const updatedAppointments = allAppointments.filter((a) => a.id !== id);
      await AsyncStorage.setItem('appointments', JSON.stringify(updatedAppointments));

      // atualiza só os do usuário atual
      setAppointments(updatedAppointments.filter((a) => a.userId === (user?.id ?? '')));

      Alert.alert('Sucesso', 'Agendamento excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      Alert.alert('Erro', 'Erro ao excluir agendamento. Tente novamente.');
    }
  };

  const confirmDelete = (appointment: Appointment): void => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja excluir o agendamento "${appointment.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteAppointment(appointment.id) },
      ]
    );
  };

  const getFilteredAppointments = (): Appointment[] => {
    if (filter === 'all') return appointments;
    return appointments.filter((a) => a.status === filter);
  };

  const renderItem = ({ item }: { item: Appointment }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={[styles.priority, styles[item.priority]]}>{item.priority.toUpperCase()}</Text>
      </View>
      {!!item.description && <Text>{item.description}</Text>}
      <Text>{item.date} às {item.time}</Text>
      <Text>Status: {item.status}</Text>

      <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Header com filtros */}
      <View style={styles.header}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'scheduled', label: 'Agendados' },
            { key: 'done', label: 'Concluídos' },
            { key: 'canceled', label: 'Cancelados' },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.filterButton, filter === option.key && styles.filterButtonActive]}
              onPress={() => setFilter(option.key as typeof filter)}
            >
              <Text style={[styles.filterButtonText, filter === option.key && styles.filterButtonTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateAppointments')}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={getFilteredAppointments()}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={appointments.length === 0 && styles.emptyContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum agendamento encontrado</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.white,
    padding: THEME.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...THEME.shadows.sm,
  },
  filtersContainer: { flex: 1, marginRight: THEME.spacing.md },
  filterButton: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    marginRight: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: COLORS.gray[100],
  },
  filterButtonActive: { backgroundColor: COLORS.primary[500] },
  filterButtonText: { fontSize: THEME.fontSize.sm, color: COLORS.gray[600] },
  filterButtonTextActive: { color: COLORS.white },
  addButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    backgroundColor: COLORS.gray[100],
    padding: 12, margin: 12, borderRadius: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontWeight: 'bold', fontSize: 16 },
  priority: { fontWeight: 'bold' },
  low: { color: 'green' },
  medium: { color: 'orange' },
  high: { color: 'red' },
  deleteButton: { marginTop: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: COLORS.gray[500], fontSize: 16 },
});
