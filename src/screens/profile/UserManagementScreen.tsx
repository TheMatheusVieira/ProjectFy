import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, THEME } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import { User } from '../../types';

export default function UserManagementScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const allUsers = await StorageService.getUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de usuários.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    Alert.alert(
      'Excluir Usuário',
      `Tem certeza que deseja excluir o usuário ${userName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteUser(userId);
              loadUsers();
              Alert.alert('Sucesso', 'Usuário excluído com sucesso.');
            } catch (error) {
              console.error('Erro ao excluir usuário:', error);
              Alert.alert('Erro', 'Não foi possível excluir o usuário.');
            }
          },
        },
      ]
    );
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={[styles.roleBadge, item.role === 'admin' ? styles.adminBadge : styles.collabBadge]}>
          <Text style={styles.roleText}>{item.role === 'admin' ? 'Admin' : 'Colab'}</Text>
        </View>
        <View>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => handleDeleteUser(item.id, item.name)}
        style={styles.deleteButton}
      >
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
      <View style={styles.header}>
        <Text style={styles.title}>Gerenciar Usuários</Text>
        <TouchableOpacity onPress={loadUsers} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={COLORS.primary[500]} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: THEME.spacing.lg,
    backgroundColor: COLORS.white,
    ...THEME.shadows.sm,
  },
  title: {
    fontSize: THEME.fontSize.xl,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  refreshButton: {
    padding: THEME.spacing.xs,
  },
  listContent: {
    padding: THEME.spacing.md,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    ...THEME.shadows.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
    marginRight: THEME.spacing.md,
    minWidth: 60,
    alignItems: 'center',
  },
  adminBadge: {
    backgroundColor: COLORS.primary[100],
  },
  collabBadge: {
    backgroundColor: COLORS.gray[100],
  },
  roleText: {
    fontSize: THEME.fontSize.xs,
    fontWeight: 'bold',
    color: COLORS.gray[700],
  },
  userName: {
    fontSize: THEME.fontSize.md,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  userEmail: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[500],
  },
  deleteButton: {
    padding: THEME.spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: THEME.spacing.xxl,
  },
  emptyText: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[500],
  },
});
