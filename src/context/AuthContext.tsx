import React, { createContext, useState, useContext, useEffect } from 'react';
import StorageService from '../services/StorageService';
import { User, RegisterFormData } from '../types';
import uuid from 'react-native-uuid';

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterFormData) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  async function loadStorageData() {
    try {
      const userToken = await StorageService.getUserToken();
      const userData = await StorageService.getCurrentUser();

      if (userToken && userData) {
        setUser(userData);
      } else {
        // Garantir que se um faltar, limpamos ambos para evitar estado inconsistente
        await StorageService.removeAuthData();
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de autenticação:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    try {
      const usersList = await StorageService.getUsers();

      const foundUser = usersList.find(
        (u) => u.email === email && u.password === password
      );

      if (foundUser) {
        await StorageService.setUserToken('logged_in');
        await StorageService.setCurrentUser(foundUser);
        setUser(foundUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    }
  }

  async function register(userData: RegisterFormData): Promise<boolean> {
    try {
      const usersList = await StorageService.getUsers();

      if (usersList.some(u => u.email === userData.email)) {
        return false;
      }

      const newUser: User = {
        id: uuid.v4() as string,
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        weeklyHours: parseInt(userData.weeklyHours) || 40,
        dailyHours: parseInt(userData.dailyHours) || 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projects: [],
        tasks: [],
        settings: StorageService.getDefaultSettings(),
      };

      await StorageService.saveUser(newUser);
      
      // Auto login após registro
      await StorageService.setUserToken('logged_in');
      await StorageService.setCurrentUser(newUser);
      setUser(newUser);
      
      return true;
    } catch (error) {
      console.error('Erro no registro:', error);
      return false;
    }
  }

  async function logout() {
    try {
      await StorageService.removeAuthData();
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  async function updateUser(userData: Partial<User>) {
    if (user) {
      const updatedUser = { ...user, ...userData };
      await StorageService.saveUser(updatedUser);
      await StorageService.setCurrentUser(updatedUser);
      setUser(updatedUser);
    }
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        isLoading, 
        login, 
        register, 
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
