import React, { useState, useEffect, JSX } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { StackNavigationProp } from '@react-navigation/stack';

// Types
import { User, RootStackParamList } from '../../types';
import { COLORS, THEME } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import { useAuth } from '../../context/AuthContext';

type ProfileScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Main'>;
};

export default function ProfileScreen({ navigation }: ProfileScreenProps): JSX.Element {
  const { logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editData, setEditData] = useState({
    name: '',
    weeklyHours: '',
    dailyHours: '',
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async (): Promise<void> => {
    try {
      const currentUser = await StorageService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setEditData({
          name: currentUser.name,
          weeklyHours: currentUser.weeklyHours.toString(),
          dailyHours: currentUser.dailyHours.toString(),
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  };

  const handleLogout = (): void => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await logout();
              // A navegação será automaticamente atualizada pelo AppNavigator
            } catch (error) {
              console.error('Erro ao fazer logout:', error);
            }
          }
        }
      ]
    );
  };

  const handleSaveProfile = async (): Promise<void> => {
    if (!user) return;

    if (!editData.name || !editData.weeklyHours || !editData.dailyHours) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    if (isNaN(Number(editData.weeklyHours)) || isNaN(Number(editData.dailyHours))) {
      Alert.alert('Erro', 'Horas devem ser números válidos');
      return;
    }

    try {
      const updatedUser: User = {
        ...user,
        name: editData.name,
        weeklyHours: parseInt(editData.weeklyHours),
        dailyHours: parseInt(editData.dailyHours),
      };

      await StorageService.saveUser(updatedUser);
      await StorageService.setCurrentUser(updatedUser);

      setUser(updatedUser);
      setEditModalVisible(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      Alert.alert('Erro', 'Erro ao atualizar perfil. Tente novamente.');
    }
  };

  const handlePickImage = async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permissão Necessária', 'Precisamos de permissão para acessar sua galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedImage = result.assets[0].uri;
      
      try {
        if (user) {
          const updatedUser: User = {
            ...user,
            avatar: selectedImage,
          };
          
          await StorageService.saveUser(updatedUser);
          await StorageService.setCurrentUser(updatedUser);
          setUser(updatedUser);
        }
      } catch (error) {
        console.error('Erro ao salvar imagem:', error);
        Alert.alert('Erro', 'Não foi possível salvar a imagem.');
      }
    }
  };

  const clearAllData = (): void => {
    Alert.alert(
      'Limpar Dados',
      'Esta ação irá remover todos os dados salvos no aplicativo. Tem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Limpar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await StorageService.clearAllData();
              Alert.alert('Sucesso', 'Todos os dados foram removidos!');
            } catch (error) {
              console.error('Erro ao limpar dados:', error);
              Alert.alert('Erro', 'Erro ao limpar dados.');
            }
          }
        }
      ]
    );
  };

  const handleExportData = async (): Promise<void> => {
    try {
      const data = await StorageService.exportData();
      const jsonString = JSON.stringify(data, null, 2);
      const fileUri = `${FileSystem.documentDirectory}projectfy_backup_${new Date().getTime()}.json`;
      
      await FileSystem.writeAsStringAsync(fileUri, jsonString);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Sucesso', 'Dados exportados para o armazenamento local.');
      }
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      Alert.alert('Erro', 'Não foi possível exportar os dados.');
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long'
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header do Perfil */}
      <View style={styles.profileHeader}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={16} color={COLORS.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <Text style={styles.memberSince}>Membro desde {memberSince}</Text>
      </View>

      {/* Estatísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user.projects?.length || 0}</Text>
          <Text style={styles.statLabel}>Projetos</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user.tasks?.length || 0}</Text>
          <Text style={styles.statLabel}>Tarefas</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user.weeklyHours}h</Text>
          <Text style={styles.statLabel}>Horas/Semana</Text>
        </View>
      </View>

      {/* Configurações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => setEditModalVisible(true)}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="person-outline" size={24} color={COLORS.primary[500]} />
            <Text style={styles.menuItemText}>Editar perfil</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>

        {user.role === 'admin' && (
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('UserManagement')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary[600]} />
              <Text style={styles.menuItemText}>Gerenciar Usuários</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="settings-outline" size={24} color={COLORS.secondary[500]} />
            <Text style={styles.menuItemText}>Preferências</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.accent[500]} />
            <Text style={styles.menuItemText}>Notificações</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>
      </View>

      {/* Dados e Backup */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dados e Backup</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleExportData}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="cloud-upload-outline" size={24} color={COLORS.primary[500]} />
            <Text style={styles.menuItemText}>Backup dos dados</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleExportData}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="download-outline" size={24} color={COLORS.secondary[500]} />
            <Text style={styles.menuItemText}>Exportar relatórios</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuItem}
          onPress={clearAllData}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="trash-outline" size={24} color={COLORS.error} />
            <Text style={[styles.menuItemText, { color: COLORS.error }]}>Limpar todos os dados</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>
      </View>

      {/* Sobre */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="help-circle-outline" size={24} color={COLORS.primary[500]} />
            <Text style={styles.menuItemText}>Ajuda</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="information-circle-outline" size={24} color={COLORS.secondary[500]} />
            <Text style={styles.menuItemText}>Sobre o app</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </TouchableOpacity>

      {/* Modal de Edição */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar perfil</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nome</Text>
                <TextInput
                  style={styles.input}
                  value={editData.name}
                  onChangeText={(value) => setEditData(prev => ({ ...prev, name: value }))}
                  placeholder="Seu nome completo"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Horas por semana</Text>
                <TextInput
                  style={styles.input}
                  value={editData.weeklyHours}
                  onChangeText={(value) => setEditData(prev => ({ ...prev, weeklyHours: value }))}
                  placeholder="40"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Horas por dia</Text>
                <TextInput
                  style={styles.input}
                  value={editData.dailyHours}
                  onChangeText={(value) => setEditData(prev => ({ ...prev, dailyHours: value }))}
                  placeholder="8"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalButtonSecondary}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButtonPrimary}
                onPress={handleSaveProfile}
              >
                <Text style={styles.modalButtonPrimaryText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: THEME.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
    paddingHorizontal: THEME.spacing.md,
    ...THEME.shadows.sm,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: THEME.spacing.md,
    position: 'relative',
    ...THEME.shadows.md,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: 'bold',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary[600],
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: THEME.fontSize.xl,
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  userEmail: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  memberSince: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[500],
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: THEME.spacing.lg,
    marginTop: 1,
    ...THEME.shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: THEME.fontSize.xl,
    color: COLORS.primary[600],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[600],
  },
  section: {
    backgroundColor: COLORS.white,
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.lg,
    ...THEME.shadows.sm,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    color: COLORS.gray[800],
    paddingHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[800],
    marginLeft: THEME.spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    marginHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.xl,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    ...THEME.shadows.md,
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: THEME.fontSize.lg,
    marginLeft: THEME.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.md,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    ...THEME.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalTitle: {
    fontSize: THEME.fontSize.lg,
    color: COLORS.gray[800],
  },
  modalBody: {
    padding: THEME.spacing.lg,
  },
  inputContainer: {
    marginBottom: THEME.spacing.md,
  },
  inputLabel: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[700],
    marginBottom: THEME.spacing.sm,
  },
  input: {
    backgroundColor: COLORS.gray[50],
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[800],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: THEME.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    gap: THEME.spacing.md,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[700],
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: THEME.fontSize.md,
    color: COLORS.white,
  },
});