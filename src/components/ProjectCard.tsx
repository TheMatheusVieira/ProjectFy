import React, { JSX } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Project } from '../types';
import { COLORS, THEME } from '../constants/colors';

const getPriorityColor = (priority: Project['priority']): string => {
  switch (priority) {
    case 'high': return COLORS.error;
    case 'medium': return COLORS.warning;
    default: return COLORS.success;
  }
};

const getStatusColor = (status: Project['status']): string => {
  switch (status) {
    case 'completed': return COLORS.success;
    case 'in_progress': return COLORS.primary[500];
    case 'planning': return COLORS.accent[500];
    default: return COLORS.gray[400];
  }
};

const getStatusLabel = (status: Project['status']): string => {
  switch (status) {
    case 'completed': return 'Concluído';
    case 'in_progress': return 'Em Andamento';
    case 'planning': return 'Planejamento';
    case 'on_hold': return 'Pausado';
    default: return 'Desconhecido';
  }
};

// Define as propriedades que o componente espera receber
type ProjectCardProps = {
  project: Project;
  onDelete: (project: Project) => void;
};

export default function ProjectCard({ project, onDelete }: ProjectCardProps): JSX.Element {
  return (
    <View style={styles.projectCard}>
      {/* Header do Card */}
      <View style={styles.projectHeader}>
        <View style={styles.projectTitleRow}>
          <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(project.priority) }]} />
          <Text style={styles.projectName} numberOfLines={1}>{project.name}</Text>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(project)}>
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      {/* Descrição */}
      {project.description && (
        <Text style={styles.projectDescription} numberOfLines={2}>{project.description}</Text>
      )}

      {/* Status e Progresso */}
      <View style={styles.statusRow}>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(project.status) }]} />
          <Text style={styles.statusText}>{getStatusLabel(project.status)}</Text>
        </View>
        <Text style={styles.progressText}>{project.progress}%</Text>
      </View>

      {/* Barra de Progresso */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${project.progress}%`, backgroundColor: getStatusColor(project.status) }]} />
      </View>

      {/* Footer */}
      <View style={styles.projectFooter}>
        <View style={styles.deadlineContainer}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.gray[500]} />
          <Text style={styles.deadlineText}>{new Date(project.deadline).toLocaleDateString('pt-BR')}</Text>
        </View>
        <View style={styles.priorityContainer}>
          <Text style={[styles.priorityText, { color: getPriorityColor(project.priority) }]}>
            {project.priority === 'high' && 'Alta'}
            {project.priority === 'medium' && 'Média'}
            {project.priority === 'low' && 'Baixa'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    projectCard: {
        backgroundColor: COLORS.white,
        borderRadius: THEME.borderRadius.lg,
        padding: THEME.spacing.md,
        marginBottom: THEME.spacing.md,
        ...THEME.shadows.sm,
      },
      projectHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: THEME.spacing.sm,
      },
      projectTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
      },
      priorityIndicator: {
        width: 4,
        height: 20,
        borderRadius: 2,
        marginRight: THEME.spacing.sm,
      },
      projectName: {
        fontSize: THEME.fontSize.lg,
        color: COLORS.gray[800],
        fontWeight: 'bold',
        flex: 1,
      },
      deleteButton: {
        padding: THEME.spacing.xs,
      },
      projectDescription: {
        fontSize: THEME.fontSize.sm,
        color: COLORS.gray[600],
        lineHeight: 20,
        marginBottom: THEME.spacing.md,
      },
      statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: THEME.spacing.sm,
      },
      statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: THEME.spacing.xs,
      },
      statusText: {
        fontSize: THEME.fontSize.sm,
        color: COLORS.gray[600],
      },
      progressText: {
        fontSize: THEME.fontSize.sm,
        color: COLORS.gray[700],
        fontWeight: '500',
      },
      progressBar: {
        height: 6,
        backgroundColor: COLORS.gray[200],
        borderRadius: 3,
        marginBottom: THEME.spacing.md,
        overflow: 'hidden',
      },
      progressFill: {
        height: '100%',
        borderRadius: 3,
      },
      projectFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      deadlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      deadlineText: {
        fontSize: THEME.fontSize.xs,
        color: COLORS.gray[600],
        marginLeft: 4,
      },
      priorityContainer: {
        paddingHorizontal: THEME.spacing.sm,
        paddingVertical: 2,
        borderRadius: THEME.borderRadius.sm,
        backgroundColor: COLORS.gray[100],
      },
      priorityText: {
        fontSize: THEME.fontSize.xs,
        fontWeight: 'bold',
      },
});