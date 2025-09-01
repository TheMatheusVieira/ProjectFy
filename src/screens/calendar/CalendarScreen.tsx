import React, { useState, JSX } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Button } from "react-native";
import { AntDesign, FontAwesome5 } from "@expo/vector-icons";
import { COLORS, THEME } from '../../constants/colors';

interface Appointment {
  id: string;
  title: string;
  description: string;
  time: string;
}

export default function AppointmentsScreen(): JSX.Element {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newAppointmentTitle, setNewAppointmentTitle] = useState('');
  const [newAppointmentDescription, setNewAppointmentDescription] = useState('');
  const [newAppointmentTime, setNewAppointmentTime] = useState('');

  const addAppointment = () => {
    if (newAppointmentTitle && newAppointmentTime) {
      setAppointments([
        ...appointments,
        {
          id: Date.now().toString(),
          title: newAppointmentTitle,
          description: newAppointmentDescription,
          time: newAppointmentTime,
        },
      ]);
      setNewAppointmentTitle('');
      setNewAppointmentDescription('');
      setNewAppointmentTime('');
      setModalVisible(false);
    }
  };

  const removeAppointment = (id: string) => {
    setAppointments(appointments.filter(item => item.id !== id));
  };

  const renderItem = ({ item }: { item: Appointment }) => (
    <View style={styles.appointmentItem}>
      <View style={styles.iconContainer}>
        <FontAwesome5 name="clock" size={20} color={COLORS.secondary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTime}>{item.time}</Text>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>
      </View>
      <TouchableOpacity onPress={() => removeAppointment(item.id)} style={styles.deleteButton}>
        <AntDesign name="close" size={24} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Botão para abrir o modal de cadastro */}
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
        <AntDesign name="plus" size={24} color={COLORS.white} />
        <Text style={styles.addButtonText}>Adicionar Agendamento</Text>
      </TouchableOpacity>

      {/* Lista de agendamentos */}
      <FlatList
        data={appointments}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        style={styles.list}
        ListEmptyComponent={() => (
          <Text style={styles.emptyListText}>Nenhum agendamento encontrado.</Text>
        )}
      />

      {/* Modal de cadastro de agendamento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Novo Agendamento</Text>
          <TextInput
            style={styles.input}
            placeholder="Título do Evento"
            placeholderTextColor={COLORS.gray[700]}
            value={newAppointmentTitle}
            onChangeText={setNewAppointmentTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Descrição"
            placeholderTextColor={COLORS.gray[700]}
            value={newAppointmentDescription}
            onChangeText={setNewAppointmentDescription}
          />
          <TextInput
            style={styles.input}
            placeholder="Horário (ex: 14:00)"
            placeholderTextColor={COLORS.gray[700]}
            value={newAppointmentTime}
            onChangeText={setNewAppointmentTime}
          />
          <View style={styles.modalButtons}>
            <Button title="Salvar" onPress={addAppointment} color={COLORS.primary[500]} />
            <Button title="Cancelar" onPress={() => setModalVisible(false)} color={COLORS.error} />
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
    padding: THEME.spacing.md,
  },
  list: {
    marginTop: THEME.spacing.md,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[500],
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    ...THEME.shadows.sm,
    marginBottom: THEME.spacing.md,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: THEME.spacing.sm,
  },
  appointmentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.sm,
  },
  itemContent: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  iconContainer: {
    width: 40,
    alignItems: "center",
  },
  itemTime: {
    fontSize: THEME.fontSize.md,
    fontWeight: "bold",
    color: COLORS.secondary[500],
  },
  itemTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: "bold",
    color: COLORS.primary[500],
  },
  itemDescription: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.primary[500],
  },
  deleteButton: {
    padding: THEME.spacing.sm,
  },
  emptyListText: {
    textAlign: 'center',
    color: COLORS.primary[500],
    marginTop: THEME.spacing.lg,
  },
  modalView: {
    margin: 20,
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.xl,
    padding: 35,
    alignItems: "center",
    ...THEME.shadows.lg,
  },
  modalTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: "bold",
    marginBottom: THEME.spacing.lg,
    color: COLORS.primary[500],
  },
  input: {
    height: 40,
    borderColor: COLORS.gray[500],
    borderWidth: 1,
    width: '100%',
    marginBottom: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
    color: COLORS.primary[500],
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
});
