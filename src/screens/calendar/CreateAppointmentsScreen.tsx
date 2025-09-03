import { useNavigation } from "@react-navigation/native";
import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Text,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../../types";

// Tipos locais
type Priority = "low" | "medium" | "high";
type Status = "scheduled" | "done" | "canceled";

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

const CreateAppointmentsScreen = () => {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState(1);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [appointmentData, setAppointmentData] = useState<Appointment>({
    id: "",
    title: "",
    description: "",
    date: "",
    time: "",
    priority: "medium",
    status: "scheduled",
    userId: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const userData = await AsyncStorage.getItem("currentUser");
        if (userData) setCurrentUser(JSON.parse(userData));
        else Alert.alert("Erro", "Usuário não encontrado. Faça login novamente.");
      } catch (e) {
        console.error("Erro ao carregar usuário:", e);
      }
    })();
  }, []);

  const handleSaveAppointment = async () => {
    if (!appointmentData.title.trim() || !appointmentData.date || !appointmentData.time) {
      Alert.alert("Campos obrigatórios", "Título, data e hora são necessários.");
      return;
    }
    if (!currentUser) {
      Alert.alert("Erro", "Usuário não encontrado. Faça login novamente.");
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(appointmentData.date)) {
      Alert.alert("Formato Inválido", "Use o formato AAAA-MM-DD para a data.");
      return;
    }

    try {
      const newAppointment: Appointment = {
        id: Date.now().toString(),
        title: appointmentData.title.trim(),
        description: (appointmentData.description || "").trim(),
        date: appointmentData.date,
        time: appointmentData.time,
        priority: appointmentData.priority,
        status: appointmentData.status,
        userId: currentUser.id,
      };

      const storedAppointments = await AsyncStorage.getItem("appointments");
      const allAppointments: Appointment[] = storedAppointments ? JSON.parse(storedAppointments) : [];

      allAppointments.push(newAppointment);
      await AsyncStorage.setItem("appointments", JSON.stringify(allAppointments));

      Alert.alert("Sucesso", "Agendamento criado com sucesso!", [
        {
          text: "OK",
          onPress: () => {
            if (navigation.canGoBack()) navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      Alert.alert("Erro", "Não foi possível salvar o agendamento. Tente novamente.");
    }
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!appointmentData.title.trim()) {
          Alert.alert("Campo obrigatório", "O título é obrigatório.");
          return false;
        }
        break;
      case 2:
        if (!appointmentData.date || !appointmentData.time) {
          Alert.alert("Campos obrigatórios", "Data e hora são obrigatórias.");
          return false;
        }
        break;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep()) setStep((s) => s + 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.mainTitle}>Novo agendamento</Text>
        <Text style={styles.subtitle}>Passo {step} de 3</Text>

        {step === 1 && (
          <View>
            <TextInput
              style={styles.input}
              placeholder="Título *"
              value={appointmentData.title}
              onChangeText={(text) =>
                setAppointmentData((prev: Appointment) => ({ ...prev, title: text }))
              }
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descrição"
              multiline
              value={appointmentData.description}
              onChangeText={(text) =>
                setAppointmentData((prev: Appointment) => ({ ...prev, description: text }))
              }
            />
          </View>
        )}

        {step === 2 && (
          <View>
            <TextInput
              style={styles.input}
              placeholder="Data (AAAA-MM-DD) *"
              value={appointmentData.date}
              onChangeText={(text) =>
                setAppointmentData((prev: Appointment) => ({ ...prev, date: text }))
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Hora (HH:mm) *"
              value={appointmentData.time}
              onChangeText={(text) =>
                setAppointmentData((prev: Appointment) => ({ ...prev, time: text }))
              }
            />

            <Text style={styles.label}>Prioridade *</Text>
            <View>
              {[
                { key: "low", label: "Baixa", color: "#10B981" },
                { key: "medium", label: "Média", color: "#F59E0B" },
                { key: "high", label: "Alta", color: "#EF4444" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.priorityOption,
                    appointmentData.priority === option.key && {
                      backgroundColor: option.color + "20",
                      borderColor: option.color,
                    },
                  ]}
                  onPress={() =>
                    setAppointmentData((prev: Appointment) => ({
                      ...prev,
                      priority: option.key as Priority,
                    }))
                  }
                >
                  <View style={[styles.priorityDot, { backgroundColor: option.color }]} />
                  <Text
                    style={[
                      styles.priorityText,
                      appointmentData.priority === option.key && { color: option.color },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.label}>Status</Text>
            {[
              { key: "scheduled", label: "Agendado" },
              { key: "done", label: "Concluído" },
              { key: "canceled", label: "Cancelado" },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.priorityOption,
                  appointmentData.status === option.key && {
                    backgroundColor: "#3B82F620",
                    borderColor: "#3B82F6",
                  },
                ]}
                onPress={() =>
                  setAppointmentData((prev: Appointment) => ({
                    ...prev,
                    status: option.key as Status,
                  }))
                }
              >
                <Text
                  style={[
                    styles.priorityText,
                    appointmentData.status === option.key && { color: "#3B82F6" },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.navigationContainer}>
          {step > 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.backButton]}
              onPress={() => setStep((s) => s - 1)}
            >
              <Text style={styles.backButtonText}>Voltar</Text>
            </TouchableOpacity>
          )}

          {step < 3 ? (
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={handleNextStep}
            >
              <Text style={styles.nextButtonText}>Avançar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton, styles.saveButton]}
              onPress={handleSaveAppointment}
            >
              <Text style={styles.saveButtonText}>Salvar Agendamento</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContainer: { padding: 16 },
  mainTitle: {
    fontSize: 24, fontWeight: "bold", textAlign: "center",
    marginBottom: 8, color: "#1F2937",
  },
  subtitle: {
    fontSize: 16, textAlign: "center", marginBottom: 24, color: "#6B7280",
  },
  input: {
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1D5DB",
    borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16,
  },
  textArea: { height: 96, textAlignVertical: "top" },
  label: { fontSize: 16, color: "#4B5563", marginBottom: 8, fontWeight: "500" },
  priorityOption: {
    flexDirection: "row", alignItems: "center",
    padding: 12, borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 8, marginBottom: 8, backgroundColor: "#FFFFFF",
  },
  priorityDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  priorityText: { fontSize: 16, color: "#374151" },
  navigationContainer: {
    flexDirection: "row", justifyContent: "space-between",
    marginTop: 32, gap: 12,
  },
  navButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: "center" },
  backButton: { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#D1D5DB" },
  nextButton: { backgroundColor: "#3B82F6" },
  saveButton: { backgroundColor: "#10B981" },
  backButtonText: { color: "#6B7280", fontSize: 16, fontWeight: "500" },
  nextButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "500" },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "500" },
});

export default CreateAppointmentsScreen;
