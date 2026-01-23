import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, THEME } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import { Appointment, User, RootStackParamList } from '../../types';
import { StackNavigationProp } from '@react-navigation/stack';

// Configuração de localidade para o calendário
LocaleConfig.locales['pt-br'] = {
  monthNames: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

type AppointmentsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

export default function AppointmentsScreen() {
  const navigation = useNavigation<AppointmentsScreenNavigationProp>();
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await StorageService.getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        const userAppointments = await StorageService.getUserAppointments(currentUser.id);
        setAppointments(userAppointments);
        generateMarkedDates(userAppointments);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMarkedDates = (data: Appointment[]) => {
    const marked: any = {};
    data.forEach(app => {
      if (!marked[app.date]) {
        marked[app.date] = { marked: true, dotColor: COLORS.primary[500] };
      }
    });

    // Destacar data selecionada
    if (marked[selectedDate]) {
      marked[selectedDate] = { ...marked[selectedDate], selected: true, selectedColor: COLORS.primary[500] };
    } else {
      marked[selectedDate] = { selected: true, selectedColor: COLORS.primary[500] };
    }

    setMarkedDates(marked);
  };

  const getDailyAppointments = () => {
    return appointments
      .filter(app => app.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const handleDateSelect = (day: any) => {
    setSelectedDate(day.dateString);
    generateMarkedDates(appointments);
  };

  const handleDeleteAppointment = (id: string) => {
    Alert.alert(
      'Excluir Compromisso',
      'Deseja remover este compromisso da sua agenda?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteAppointment(id);
              await loadData();
            } catch (error) {
              console.error('Erro ao excluir agendamento:', error);
            }
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority: Appointment['priority']) => {
    switch (priority) {
      case 'high': return COLORS.error;
      case 'medium': return COLORS.warning;
      default: return COLORS.success;
    }
  };

  const renderAppointmentItem = ({ item }: { item: Appointment }) => (
    <TouchableOpacity 
      style={styles.appointmentCard}
      onPress={() => navigation.navigate('CreateAppointment', { appointment: item })}
    >
      <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(item.priority) }]} />
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{item.time}</Text>
      </View>
      <View style={styles.appointmentContent}>
        <Text style={styles.appointmentTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.appointmentDesc} numberOfLines={1}>{item.description}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={() => handleDeleteAppointment(item.id)}>
        <Ionicons name="trash-outline" size={20} color={COLORS.gray[400]} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (isLoading && appointments.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDateSelect}
        markedDates={markedDates}
        theme={{
          backgroundColor: COLORS.white,
          calendarBackground: COLORS.white,
          textSectionTitleColor: COLORS.gray[400],
          selectedDayBackgroundColor: COLORS.primary[500],
          selectedDayTextColor: COLORS.white,
          todayTextColor: COLORS.primary[500],
          dayTextColor: COLORS.gray[700],
          textDisabledColor: COLORS.gray[200],
          dotColor: COLORS.primary[500],
          selectedDotColor: COLORS.white,
          arrowColor: COLORS.primary[500],
          monthTextColor: COLORS.gray[800],
          indicatorColor: COLORS.primary[500],
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '500',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
        }}
      />

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          Compromissos para {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
        </Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateAppointment', { selectedDate })}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Novo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={getDailyAppointments()}
        keyExtractor={(item) => item.id}
        renderItem={renderAppointmentItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.gray[200]} />
            <Text style={styles.emptyText}>Nenhum compromisso para este dia.</Text>
          </View>
        }
      />
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
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: THEME.spacing.md,
    backgroundColor: COLORS.white,
    marginTop: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  listTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.full,
    gap: 4,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: THEME.fontSize.sm,
    fontWeight: 'bold',
  },
  listContent: {
    padding: THEME.spacing.md,
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    alignItems: 'center',
    ...THEME.shadows.sm,
  },
  priorityIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
  timeContainer: {
    width: 60,
    marginRight: THEME.spacing.md,
  },
  timeText: {
    fontSize: THEME.fontSize.md,
    fontWeight: 'bold',
    color: COLORS.primary[500],
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: 'bold',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  appointmentDesc: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[500],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[400],
    marginTop: THEME.spacing.md,
  },
});
