import React, { useState, useEffect, useCallback } from 'react';
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
import { Purchase, RootStackParamList, Project } from '../../types';
import uuid from 'react-native-uuid';

type ProjectPurchasesScreenRouteProp = RouteProp<RootStackParamList, 'ProjectPurchases'>;

export default function ProjectPurchasesScreen() {
  const route = useRoute<ProjectPurchasesScreenRouteProp>();
  const navigation = useNavigation();
  const { projectId, projectName } = route.params;

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  // Form State
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<'planned' | 'purchased'>('planned');

  useEffect(() => {
    loadPurchases();
  }, [projectId]);

  const loadPurchases = async () => {
    setIsLoading(true);
    try {
      const data = await StorageService.getProjectPurchases(projectId);
      setPurchases(data);
    } catch (error) {
      console.error('Erro ao carregar compras:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePurchase = async () => {
    if (!item.trim() || !quantity || !price) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const purchase: Purchase = {
        id: editingPurchase?.id || uuid.v4() as string,
        projectId,
        item: item.trim(),
        quantity: parseInt(quantity),
        price: parseFloat(price.replace(',', '.')),
        status,
        synced: false,
        updatedAt: new Date().toISOString(),
      };

      await StorageService.savePurchase(purchase);
      await loadPurchases();
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar compra:', error);
      Alert.alert('Erro', 'Não foi possível salvar a compra.');
    }
  };

  const handleDeletePurchase = (id: string) => {
    Alert.alert(
      'Excluir Item',
      'Tem certeza que deseja remover este item da lista?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deletePurchase(id);
              await loadPurchases();
            } catch (error) {
              console.error('Erro ao excluir compra:', error);
            }
          },
        },
      ]
    );
  };

  const openModal = (purchase?: Purchase) => {
    if (purchase) {
      setEditingPurchase(purchase);
      setItem(purchase.item);
      setQuantity(purchase.quantity.toString());
      setPrice(purchase.price.toString());
      setStatus(purchase.status);
    } else {
      setEditingPurchase(null);
      setItem('');
      setQuantity('1');
      setPrice('');
      setStatus('planned');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingPurchase(null);
    setItem('');
    setQuantity('');
    setPrice('');
    setStatus('planned');
  };

  const getTotalCost = () => {
    return purchases.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const renderPurchaseItem = ({ item }: { item: Purchase }) => (
    <View style={styles.purchaseCard}>
      <View style={styles.purchaseInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.item}</Text>
          <View style={[styles.statusBadge, item.status === 'purchased' ? styles.statusPurchased : styles.statusPlanned]}>
            <Text style={styles.statusText}>{item.status === 'purchased' ? 'Comprado' : 'Planejado'}</Text>
          </View>
        </View>
        <Text style={styles.itemDetails}>
          {item.quantity}x {formatCurrency(item.price)} = <Text style={styles.itemTotal}>{formatCurrency(item.price * item.quantity)}</Text>
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={() => openModal(item)} style={styles.actionButton}>
          <Ionicons name="create-outline" size={20} color={COLORS.primary[500]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeletePurchase(item.id)} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
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
      {/* Summary Section */}
      <View style={styles.summarySection}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Estimado</Text>
          <Text style={styles.summaryValue}>{formatCurrency(getTotalCost())}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Ionicons name="add" size={24} color={COLORS.white} />
          <Text style={styles.addButtonText}>Novo Item</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={purchases}
        keyExtractor={(item) => item.id}
        renderItem={renderPurchaseItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={48} color={COLORS.gray[200]} />
            <Text style={styles.emptyText}>Nenhum item na lista de compras.</Text>
          </View>
        }
      />

      {/* Purchase Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingPurchase ? 'Editar Item' : 'Novo Item'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Item *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Cimento, Tinta, etc."
                value={item}
                onChangeText={setItem}
              />

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Qtd *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
                <View style={{ width: 16 }} />
                <View style={styles.flex2}>
                  <Text style={styles.label}>Preço Unitário (R$) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0,00"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>

              <Text style={styles.label}>Status</Text>
              <View style={styles.statusSelector}>
                <TouchableOpacity
                  style={[styles.statusOption, status === 'planned' && styles.statusOptionActive]}
                  onPress={() => setStatus('planned')}
                >
                  <Text style={[styles.statusOptionText, status === 'planned' && styles.statusOptionTextActive]}>Planejado</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusOption, status === 'purchased' && styles.statusOptionActive]}
                  onPress={() => setStatus('purchased')}
                >
                  <Text style={[styles.statusOptionText, status === 'purchased' && styles.statusOptionTextActive]}>Comprado</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSavePurchase}>
                <Text style={styles.saveButtonText}>Salvar Item</Text>
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
  summarySection: {
    backgroundColor: COLORS.white,
    padding: THEME.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...THEME.shadows.md,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: 'bold',
    color: COLORS.primary[500],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
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
  purchaseCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    alignItems: 'center',
    ...THEME.shadows.sm,
  },
  purchaseInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  itemName: {
    fontSize: THEME.fontSize.md,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPurchased: {
    backgroundColor: COLORS.success + '20',
  },
  statusPlanned: {
    backgroundColor: COLORS.warning + '20',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.gray[600],
  },
  itemDetails: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[500],
  },
  itemTotal: {
    fontWeight: 'bold',
    color: COLORS.gray[700],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  actionButton: {
    padding: THEME.spacing.xs,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.backdrop,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    maxHeight: '80%',
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
  input: {
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[800],
    marginBottom: THEME.spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  statusSelector: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: 4,
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
