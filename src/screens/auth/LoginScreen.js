import React, { useState } from 'react';
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
import { COLORS, THEME } from '../../constants/colors';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Erro', 'Por favor, insira um e-mail válido');
      return;
    }

    setIsLoading(true);

    try {
      // Simular login - verificar se usuário existe no storage
      const users = await AsyncStorage.getItem('users');
      const usersList = users ? JSON.parse(users) : [];
      
      const user = usersList.find(u => u.email === email && u.password === password);
      
      if (user) {
        // Salvar token de autenticação
        await AsyncStorage.setItem('userToken', 'logged_in');
        await AsyncStorage.setItem('currentUser', JSON.stringify(user));
        
        // Resetar navegação para a tela principal
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        Alert.alert('Erro', 'E-mail ou senha incorretos');
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao fazer login. Tente novamente.');
      console.error('Erro no login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };


// const handleLogout = async () => {
//   try {
//     await AsyncStorage.removeItem('userToken');
//     await AsyncStorage.removeItem('currentUser');

//     navigation.reset({
//       index: 0,
//       routes: [{ name: 'Login' }],
//     });
//   } catch (error) {
//     console.error('Erro ao fazer logout:', error);
//     Alert.alert('Erro', 'Não foi possível sair. Tente novamente.');
//   }
// };
  

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Gestão IST</Text>
          <Text style={styles.subtitle}>Entre na sua conta</Text>
        </View>

        <View style={styles.form}>
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
              value={email}
              onChangeText={setEmail}
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
              value={password}
              onChangeText={setPassword}
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

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem uma conta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Cadastre-se</Text>
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
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xxl,
  },
  title: {
    fontSize: THEME.fontSize.xxxl,
    fontWeight: THEME.fontWeight.bold,
    color: COLORS.primary[500],
    marginBottom: THEME.spacing.sm,
  },
  subtitle: {
    fontSize: THEME.fontSize.lg,
    color: COLORS.gray[600],
  },
  form: {
    marginBottom: THEME.spacing.xl,
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
  loginButton: {
    backgroundColor: COLORS.primary[500],
    borderRadius: THEME.borderRadius.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: THEME.spacing.md,
    ...THEME.shadows.md,
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray[400],
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: THEME.fontSize.md,
    color: COLORS.gray[600],
    marginRight: THEME.spacing.xs,
  },
  registerLink: {
    fontSize: THEME.fontSize.md,
    color: COLORS.primary[500],
    fontWeight: THEME.fontWeight.semibold,
  },
});