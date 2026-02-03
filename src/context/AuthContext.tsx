import React, { createContext, useState, useContext, useEffect } from 'react';
import StorageService from '../services/StorageService';
import { User, RegisterFormData } from '../types';
import uuid from 'react-native-uuid';

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (name: string, email: string) => Promise<boolean>;
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

  async function login(name: string, email: string): Promise<boolean> {
    try {
      if (!name.trim() || !email.trim()) return false;
      
      const usersList = await StorageService.getUsers();
      const lowerEmail = email.trim().toLowerCase();
      
      let foundUser = usersList.find(
        (u) => u.email?.toLowerCase() === lowerEmail
      );
      
      if (!foundUser) {
        // Se não encontrar, cria um novo usuário
        foundUser = {
          id: uuid.v4() as string,
          name: name.trim(),
          email: email.trim(),
          role: 'admin',
          weeklyHours: 40,
          dailyHours: 8,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          projects: [],
          tasks: [],
          settings: StorageService.getDefaultSettings(),
        };
        await StorageService.saveUser(foundUser);
      } else if (foundUser.name !== name.trim()) {
        // Se encontrar mas o nome for diferente, atualiza o nome
        foundUser.name = name.trim();
        foundUser.updatedAt = new Date().toISOString();
        await StorageService.saveUser(foundUser);
      }

      await StorageService.setUserToken('logged_in');
      await StorageService.setCurrentUser(foundUser);
      setUser(foundUser);
      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    }
  }

// register function was removed in favor of automatic account creation during login

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
