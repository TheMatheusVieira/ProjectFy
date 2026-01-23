import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View, ActivityIndicator } from "react-native";

// Context
import { useAuth } from "../context/AuthContext";

// Screens
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import DashboardScreen from "../screens/dashboard/DashboardScreen";
import ProjectsScreen from "../screens/projects/ProjectsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import LoadingScreen from "../screens/LoadingScreen";
import AppointmentsScreen from "../screens/calendar/AppointmentsScreen";
import CreateProjectScreen from "../screens/projects/CreateProjectScreen";
import UserManagementScreen from "../screens/profile/UserManagementScreen";
import ProjectNotesScreen from "../screens/projects/ProjectNotesScreen";
import AlertsScreen from "../screens/dashboard/AlertsScreen";
import ProjectTasksScreen from "../screens/projects/ProjectTasksScreen";
import ProjectAttachmentsScreen from "../screens/projects/ProjectAttachmentsScreen";
import CreateAppointmentScreen from "../screens/calendar/CreateAppointmentScreen";
import TimeTrackingScreen from "../screens/timer/TimeTrackingScreen";
import ReportsScreen from "../screens/dashboard/ReportsScreen";
import ProjectPurchasesScreen from "../screens/projects/ProjectPurchasesScreen";

// Constants
import { COLORS } from "../constants/colors";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator para usuários autenticados
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Projetos") {
            iconName = focused ? "folder" : "folder-outline";
          } else if (route.name === "Agenda") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Relatorios") {
            iconName = focused ? "bar-chart" : "bar-chart-outline";
          } else if (route.name === "Perfil") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary[500],
        tabBarInactiveTintColor: COLORS.gray[400],
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.gray[200],
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: COLORS.primary[500],
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Home" }}
      />
      <Tab.Screen
        name="Projetos"
        component={ProjectsScreen}
        options={{ title: "Projetos" }}
      />
      <Tab.Screen
        name="Agenda"
        component={AppointmentsScreen}
        options={{ title: "Agenda" }}
      />
      <Tab.Screen
        name="Relatorios"
        component={ReportsScreen}
        options={{ title: "Relatórios" }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{ title: "Perfil" }}
      />
    </Tab.Navigator>
  );
}

// Stack Navigator principal
export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary[500],
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="Main"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreateProject"
            component={CreateProjectScreen}
            options={{ title: "Novo Projeto" }}
          />
          <Stack.Screen
            name="UserManagement"
            component={UserManagementScreen}
            options={{ title: "Gerenciar Usuários" }}
          />
          <Stack.Screen
            name="ProjectNotes"
            component={ProjectNotesScreen}
            options={({ route }) => ({ title: `Notas: ${route.params.projectName}` })}
          />
          <Stack.Screen
            name="Alerts"
            component={AlertsScreen}
            options={{ title: "Notificações" }}
          />
          <Stack.Screen
            name="ProjectTasks"
            component={ProjectTasksScreen}
            options={({ route }) => ({ title: `Tarefas: ${route.params.projectName}` })}
          />
          <Stack.Screen
            name="ProjectAttachments"
            component={ProjectAttachmentsScreen}
            options={({ route }) => ({ title: `Anexos: ${route.params.projectName}` })}
          />
          <Stack.Screen
            name="ProjectPurchases"
            component={ProjectPurchasesScreen}
            options={({ route }) => ({ title: `Compras: ${route.params.projectName}` })}
          />
          <Stack.Screen
            name="CreateAppointment"
            component={CreateAppointmentScreen}
            options={{ title: "Agendamento" }}
          />
          <Stack.Screen
            name="TimeTracking"
            component={TimeTrackingScreen}
            options={({ route }) => ({ title: `Cronômetro: ${route.params.projectName}` })}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: "Cadastro" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
