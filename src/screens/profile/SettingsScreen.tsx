import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, THEME } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import { User, UserSettings } from '../../types';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentUser = await StorageService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setSettings(currentUser.settings || StorageService.getDefaultSettings());
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNotification = (key: keyof UserSettings['notifications']) => {
    if (!settings) return;
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const saveSettings = async (newSettings: UserSettings) => {
    if (!user) return;
    try {
      await StorageService.updateUserSettings(user.id, newSettings);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    }
  };

  if (isLoading || !settings) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificações</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Habilitar Notificações</Text>
            <Text style={styles.settingDesc}>Receber alertas do sistema</Text>
          </View>
          <Switch
            value={settings.notifications.enabled}
            onValueChange={() => handleToggleNotification('enabled')}
            trackColor={{ false: COLORS.gray[300], true: COLORS.primary[200] }}
            thumbColor={settings.notifications.enabled ? COLORS.primary[500] : COLORS.gray[400]}
          />
        </View>

        {settings.notifications.enabled && (
          <>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Prazos de Projetos</Text>
                <Text style={styles.settingDesc}>Alertas quando um prazo estiver próximo</Text>
              </View>
              <Switch
                value={settings.notifications.deadlines}
                onValueChange={() => handleToggleNotification('deadlines')}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary[200] }}
                thumbColor={settings.notifications.deadlines ? COLORS.primary[500] : COLORS.gray[400]}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Novas Tarefas</Text>
                <Text style={styles.settingDesc}>Alertas ao receber novas tarefas</Text>
              </View>
              <Switch
                value={settings.notifications.tasks}
                onValueChange={() => handleToggleNotification('tasks')}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary[200] }}
                thumbColor={settings.notifications.tasks ? COLORS.primary[500] : COLORS.gray[400]}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Compromissos</Text>
                <Text style={styles.settingDesc}>Lembretes de reuniões e eventos</Text>
              </View>
              <Switch
                value={settings.notifications.appointments}
                onValueChange={() => handleToggleNotification('appointments')}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary[200] }}
                thumbColor={settings.notifications.appointments ? COLORS.primary[500] : COLORS.gray[400]}
              />
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aparência</Text>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="color-palette-outline" size={24} color={COLORS.primary[500]} />
            <View style={styles.menuItemInfo}>
              <Text style={styles.menuItemText}>Tema</Text>
              <Text style={styles.menuItemSubtext}>
                {settings.theme === 'system' ? 'Padrão do Sistema' : settings.theme === 'dark' ? 'Escuro' : 'Claro'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Idioma</Text>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="language-outline" size={24} color={COLORS.secondary[500]} />
            <View style={styles.menuItemInfo}>
              <Text style={styles.menuItemText}>Idioma do App</Text>
              <Text style={styles.menuItemSubtext}>
                {settings.language === 'pt-BR' ? 'Português (Brasil)' : 'English (US)'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  section: {
    backgroundColor: COLORS.white,
    marginTop: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    ...THEME.shadows.sm,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.sm,
    fontWeight: 'bold',
    color: COLORS.primary[500],
    paddingHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  settingInfo: {
    flex: 1,
    marginRight: THEME.spacing.md,
  },
  settingLabel: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[800],
    fontWeight: '500',
  },
  settingDesc: {
    fontSize: THEME.fontSize.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemInfo: {
    marginLeft: THEME.spacing.md,
  },
  menuItemText: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[800],
    fontWeight: '500',
  },
  menuItemSubtext: {
    fontSize: THEME.fontSize.xs,
    color: COLORS.gray[500],
    marginTop: 2,
  },
});
