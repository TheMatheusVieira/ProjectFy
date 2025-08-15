import React, { JSX, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';

// Types
import { RootStackParamList, User, RegisterFormData } from '../../types';
import { COLORS, THEME } from '../../constants/colors';

type RegisterScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: RegisterScreenProps): JSX.Element {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    weeklyHours: '40',
    dailyHours: '8',
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleInputChange = (field: keyof RegisterFormData, value: string): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    const { name, email, password, confirmPassword, weeklyHours, dailyHours } = formData;

    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios');
      return false;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Erro', 'Por favor, insira um e-mail válido');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return false;
    }

    if (isNaN(Number(weeklyHours)) || isNaN(Number(dailyHours)) || Number(weeklyHours) <= 0 || Number(dailyHours) <= 0) {
      Alert.alert('Erro', 'Horas de trabalho devem ser números válidos');
      return false;
    }

    return true;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async (): Promise<void> => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Verificar se o e-mail já existe
      const users = await AsyncStorage.getItem('users');
      const usersList: User[] = users ? JSON.parse(users) : [];
      
      const existingUser = usersList.find(u => u.email === formData.email);
      if (existingUser) {
        Alert.alert('Erro', 'Este e-mail já está cadastrado');
        setIsLoading(false);
        return;
      }

      // Criar novo usuário
      const newUser: User = {
        id: Date.now().toString(),
        name: formData.name,
        email: formData.email,
        password: formData.password,
        weeklyHours: parseInt(formData.weeklyHours),
        dailyHours: parseInt(formData.dailyHours),
        createdAt: new Date().toISOString(),
        projects: [],
        tasks: [],
      };

      // Adicionar à lista de usuários
      usersList.push(newUser);
      await AsyncStorage.setItem('users', JSON.stringify(usersList));

      // Fazer login automático
      await AsyncStorage.setItem('userToken', 'logged_in');
      await AsyncStorage.setItem('currentUser', JSON.stringify(newUser));

      Alert.alert(
        'Sucesso!', 
        'Conta criada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            }
          }
        ]
      );

    } catch (error) {
      Alert.alert('Erro', 'Erro ao criar conta. Tente novamente.');
      console.error('Erro no registro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Preencha os dados abaixo</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons 
              name="person-outline" 
              size={20} 
              color={COLORS.gray[400]} 
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons 
              name="mail-outline" 
              size={20} 
              color={COLORS.gray[400]} 
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color={COLORS.gray[400]} 
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color={COLORS.gray[400]} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color={COLORS.gray[400]} 
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirmar senha"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color={COLORS.gray[400]} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.workHoursContainer}>
            <Text style={styles.sectionTitle}>Configuração de Trabalho</Text>
            
            <View style={styles.hoursRow}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Ionicons 
                  name="time-outline" 
                  size={20} 
                  color={COLORS.gray[400]} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="40"
                  value={formData.weeklyHours}
                  onChangeText={(value) => handleInputChange('weeklyHours', value)}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.hoursLabel}>horas/semana</Text>
            </View>

            <View style={styles.hoursRow}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Ionicons 
                  name="time-outline" 
                  size={20} 
                  color={COLORS.gray[400]} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="8"
                  value={formData.dailyHours}
                  onChangeText={(value) => handleInputChange('dailyHours', value)}
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.hoursLabel}>horas/dia</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? 'Criando conta...' : 'Criar Conta'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Já tem uma conta?</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginLink}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: THEME.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
    marginTop: THEME.spacing.xl,
  },
  title: {
    fontSize: THEME.fontSize.xxl,
    color: COLORS.primary[500],
    marginBottom: THEME.spacing.sm,
  },
  subtitle: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[600],
  },
  form: {
    marginBottom: THEME.spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.md,
    ...THEME.shadows.sm,
  },
  inputIcon: {
    marginRight: THEME.spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[800],
  },
  eyeIcon: {
    padding: THEME.spacing.sm,
  },
  workHoursContainer: {
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    color: COLORS.gray[700],
    marginBottom: THEME.spacing.md,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  halfWidth: {
    flex: 0.6,
    marginRight: THEME.spacing.md,
  },
  hoursLabel: {
    flex: 0.4,
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[600],
  },
  registerButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: THEME.borderRadius.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: THEME.spacing.lg,
    ...THEME.shadows.md,
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray[400],
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: THEME.fontSize.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: THEME.spacing.md,
  },
  footerText: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[600],
    marginRight: THEME.spacing.xs,
  },
  loginLink: {
    fontSize: THEME.fontSize.md,
    color: COLORS.primary[500],
  },
});