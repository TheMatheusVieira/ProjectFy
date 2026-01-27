import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, THEME } from '../../constants/colors';
import StorageService from '../../services/StorageService';
import ExportService from '../../services/ExportService';
import { Project, Task, TimeLog, User } from '../../types';
import { useFocusEffect } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;

export default function ReportsScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    projectsByStatus: [] as any[],
    taskCompletion: 0,
    totalHours: 0,
    hoursByProject: { labels: [] as string[], datasets: [{ data: [] as number[] }] },
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await StorageService.getCurrentUser();
      setUser(currentUser);
      if (!currentUser) return;

      const userProjects = await StorageService.getUserProjects(currentUser.id);
      setProjects(userProjects);

      const allTasks = await StorageService.getTasks();
      const userTasks = allTasks.filter(t => t.userId === currentUser.id);
      setTasks(userTasks);

      const allLogs = await StorageService.getTimeLogs();
      const userLogs = allLogs.filter(l => l.userId === currentUser.id);
      setLogs(userLogs);

      // Projetos por Status
      const statusCounts = userProjects.reduce((acc: any, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {});

      const projectsByStatus = [
        { name: 'Planejamento', count: statusCounts.planning || 0, color: COLORS.accent[500], legendFontColor: COLORS.gray[600], legendFontSize: 12 },
        { name: 'Em Andamento', count: statusCounts.in_progress || 0, color: COLORS.primary[500], legendFontColor: COLORS.gray[600], legendFontSize: 12 },
        { name: 'Concluídos', count: statusCounts.completed || 0, color: COLORS.success, legendFontColor: COLORS.gray[600], legendFontSize: 12 },
        { name: 'Pausados', count: statusCounts.on_hold || 0, color: COLORS.gray[400], legendFontColor: COLORS.gray[600], legendFontSize: 12 },
      ].filter(item => item.count > 0);

      // Conclusão de Tarefas
      const completedTasks = userTasks.filter(t => t.completed).length;
      const taskCompletion = userTasks.length > 0 ? (completedTasks / userTasks.length) * 100 : 0;

      // Horas por Projeto
      const hoursByProjectMap = userLogs.reduce((acc: any, log) => {
        const project = userProjects.find(p => p.id === log.projectId);
        const projectName = project ? project.name : 'Outros';
        acc[projectName] = (acc[projectName] || 0) + (log.duration / 3600);
        return acc;
      }, {});

      const hoursByProject = {
        labels: Object.keys(hoursByProjectMap).slice(0, 5),
        datasets: [{ data: Object.values(hoursByProjectMap).slice(0, 5) as number[] }]
      };

      const totalHours = userLogs.reduce((acc, log) => acc + (log.duration / 3600), 0);

      setStats({
        totalProjects: userProjects.length,
        projectsByStatus,
        taskCompletion,
        totalHours,
        hoursByProject,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleExportPDF = async () => {
    if (!user || projects.length === 0) {
      Alert.alert('Aviso', 'Não há dados suficientes para exportar.');
      return;
    }

    setIsExporting(true);
    try {
      await ExportService.generateProjectReport(user, projects, tasks, logs);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o relatório PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const chartConfig = {
    backgroundGradientFrom: COLORS.white,
    backgroundGradientTo: COLORS.white,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.title}>Relatórios</Text>
            <Text style={styles.subtitle}>Visão geral da sua produtividade</Text>
          </View>
          <TouchableOpacity 
            style={[styles.exportButton, isExporting && styles.exportButtonDisabled]} 
            onPress={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color={COLORS.white} />
                <Text style={styles.exportButtonText}>PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Resumo Rápido */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.totalProjects}</Text>
          <Text style={styles.summaryLabel}>Projetos</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{stats.totalHours.toFixed(1)}h</Text>
          <Text style={styles.summaryLabel}>Trabalhadas</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{Math.round(stats.taskCompletion)}%</Text>
          <Text style={styles.summaryLabel}>Tarefas</Text>
        </View>
      </View>

      {/* Gráfico de Status de Projetos */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Status dos Projetos</Text>
        {stats.projectsByStatus.length > 0 ? (
          <PieChart
            data={stats.projectsByStatus}
            width={screenWidth - 32}
            height={200}
            chartConfig={chartConfig}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        ) : (
          <Text style={styles.noData}>Sem dados de projetos.</Text>
        )}
      </View>

      {/* Gráfico de Horas por Projeto */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Horas por Projeto (Top 5)</Text>
        {stats.hoursByProject.labels.length > 0 ? (
          <BarChart
            data={stats.hoursByProject}
            width={screenWidth - 32}
            height={220}
            yAxisLabel=""
            yAxisSuffix="h"
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            fromZero
          />
        ) : (
          <Text style={styles.noData}>Sem registros de tempo.</Text>
        )}
      </View>

      <View style={{ height: 40 }} />
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
  header: {
    padding: THEME.spacing.lg,
    backgroundColor: COLORS.white,
    ...THEME.shadows.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: THEME.fontSize.xl,
    fontWeight: 'bold',
    color: COLORS.gray[800],
  },
  subtitle: {
    fontSize: THEME.fontSize.sm,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    gap: 8,
  },
  exportButtonDisabled: {
    backgroundColor: COLORS.gray[400],
  },
  exportButtonText: {
    color: COLORS.white,
    fontSize: THEME.fontSize.sm,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    padding: THEME.spacing.md,
    gap: THEME.spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    alignItems: 'center',
    ...THEME.shadows.sm,
  },
  summaryValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: 'bold',
    color: COLORS.primary[500],
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.gray[500],
    textTransform: 'uppercase',
    marginTop: 4,
  },
  chartSection: {
    backgroundColor: COLORS.white,
    margin: THEME.spacing.md,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    ...THEME.shadows.sm,
  },
  chartTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: 'bold',
    color: COLORS.gray[700],
    marginBottom: THEME.spacing.md,
  },
  noData: {
    textAlign: 'center',
    color: COLORS.gray[400],
    paddingVertical: 40,
  },
});
