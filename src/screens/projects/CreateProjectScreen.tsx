import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import React, { useState, useEffect } from "react";
import { 
    SafeAreaView, 
    ScrollView, 
    View, 
    TextInput,  
    TouchableOpacity, 
    StyleSheet, 
    Alert,
    Text,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Project, User, RootStackParamList, ProjectStatus } from "../../types";
import StorageService from "../../services/StorageService";
import NotificationManager from "../../services/NotificationManager";
import { COLORS, THEME } from "../../constants/colors";
import { v4 as uuidv4 } from 'uuid';

type CreateProjectScreenRouteProp = RouteProp<RootStackParamList, 'CreateProject'>;

type Priority = 'high' | 'medium' | 'low';

type TeamMember = {
  id: string;
  name: string;
  role: string;
};

const CreateProjectScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<CreateProjectScreenRouteProp>();
    const editingProject = route.params?.project;

    const [step, setStep] = useState(1);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const [projectData, setProjectData] = useState({
        name: editingProject?.name || '',
        company: editingProject?.company || '',
        description: editingProject?.description || '',
        estimatedHours: editingProject?.estimatedHours?.toString() || '0',
        startDate: editingProject?.startDate || new Date().toISOString().split('T')[0],
        deadline: editingProject?.deadline || '',
        priority: editingProject?.priority || 'medium' as Priority,
        status: editingProject?.status || 'planning' as ProjectStatus,
        team: editingProject?.team || [] as TeamMember[],
    });

    const [memberName, setMemberName] = useState('');
    const [memberRole, setMemberRole] = useState('');

    useEffect(() => {
        loadCurrentUser();
    }, []);

    const loadCurrentUser = async () => {
        try {
            const userData = await StorageService.getCurrentUser();
            if (userData) {
                setCurrentUser(userData);
            } else {
                Alert.alert('Erro', 'Usuário não encontrado. Faça login novamente.');
            }
        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
        }
    };

    const handleAddMember = () => {
        if (!memberName.trim() || !memberRole.trim()) {
            Alert.alert('Aviso', 'Nome e função do membro são obrigatórios.');
            return;
        }
        const newMember: TeamMember = {
            id: uuidv4(),
            name: memberName.trim(),
            role: memberRole.trim(),
        };
        setProjectData(prev => ({ ...prev, team: [...prev.team, newMember] }));
        setMemberName('');
        setMemberRole('');
    };

    const handleRemoveMember = (id: string) => {
        setProjectData(prev => ({
            ...prev,
            team: prev.team.filter(member => member.id !== id),
        }));
    };

    const handleSaveProject = async () => {
        if (!projectData.name.trim() || !projectData.deadline || !projectData.description.trim()) {
            Alert.alert("Campos Obrigatórios", "Nome, descrição e prazo são necessários.");
            return;
        }

        if (!currentUser) {
            Alert.alert("Erro", "Usuário não encontrado. Faça login novamente.");
            return;
        }

        // Validar formato da data
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(projectData.deadline) || !dateRegex.test(projectData.startDate)) {
            Alert.alert("Formato Inválido", "Use o formato AAAA-MM-DD para as datas.");
            return;
        }

        try {
            const now = new Date().toISOString();
            const project: Project = {
                id: editingProject?.id || uuidv4(),
                name: projectData.name.trim(),
                description: projectData.description.trim(),
                progress: editingProject?.progress || 0,
                startDate: projectData.startDate,
                deadline: projectData.deadline,
                priority: projectData.priority,
                status: projectData.status,
                createdAt: editingProject?.createdAt || now,
                updatedAt: now,
                userId: currentUser.id,
                tasks: editingProject?.tasks || [],
                company: projectData.company.trim() || undefined,
                estimatedHours: parseInt(projectData.estimatedHours) || 0,
                team: projectData.team,
            };

            // Se o status mudou, gerar notificação
            if (editingProject && editingProject.status !== project.status) {
                await NotificationManager.createProjectAlert(project.id, project.name, 'status');
            }

            await StorageService.saveProject(project);

            Alert.alert('Sucesso', `Projeto ${editingProject ? 'atualizado' : 'criado'} com sucesso!`, [
                {
                    text: 'OK',
                    onPress: () => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        }
                    }
                }
            ]);

        } catch (error) {
            console.error('Erro ao salvar projeto:', error);
            Alert.alert('Erro', 'Não foi possível salvar o projeto. Tente novamente.');
        }
    };

    const validateStep = () => {
        switch (step) {
            case 1:
                if (!projectData.name.trim() || !projectData.description.trim()) {
                    Alert.alert('Campos Obrigatórios', 'Nome e descrição são obrigatórios.');
                    return false;
                }
                break;
            case 2:
                if (!projectData.deadline || !projectData.startDate) {
                    Alert.alert('Campo Obrigatório', 'Datas de início e prazo final são obrigatórias.');
                    return false;
                }
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(projectData.deadline) || !dateRegex.test(projectData.startDate)) {
                    Alert.alert("Formato Inválido", "Use o formato AAAA-MM-DD para as datas.");
                    return false;
                }
                break;
        }
        return true;
    };

    const handleNextStep = () => {
        if (validateStep()) {
            setStep(s => s + 1);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.mainTitle}>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</Text>
                <Text style={styles.subtitle}>Passo {step} de 3</Text>


                {/* PASSO 1: INFORMAÇÕES BÁSICAS */}
                {step === 1 && (
                    <View>
                        <Text style={styles.stepTitle}>Informações Básicas</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Nome do Projeto *" 
                            value={projectData.name} 
                            onChangeText={text => setProjectData(p => ({ ...p, name: text }))} 
                        />
                        <TextInput 
                            style={styles.input} 
                            placeholder="Empresa / Cliente" 
                            value={projectData.company} 
                            onChangeText={text => setProjectData(p => ({ ...p, company: text }))} 
                        />
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="Descrição do Projeto *" 
                            multiline 
                            value={projectData.description} 
                            onChangeText={text => setProjectData(p => ({ ...p, description: text }))} 
                        />
                        
                        {editingProject && (
                            <View>
                                <Text style={styles.label}>Status</Text>
                                <View style={styles.statusContainer}>
                                    {[
                                        { key: 'planning', label: 'Planejamento' },
                                        { key: 'in_progress', label: 'Em Andamento' },
                                        { key: 'completed', label: 'Concluído' },
                                        { key: 'on_hold', label: 'Pausado' },
                                    ].map(option => (
                                        <TouchableOpacity
                                            key={option.key}
                                            style={[
                                                styles.statusOption,
                                                projectData.status === option.key && styles.statusOptionActive
                                            ]}
                                            onPress={() => setProjectData(p => ({ ...p, status: option.key as ProjectStatus }))}
                                        >
                                            <Text style={[
                                                styles.statusOptionText,
                                                projectData.status === option.key && styles.statusOptionTextActive
                                            ]}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* PASSO 2: DETALHES DO PROJETO */}
                {step === 2 && (
                    <View>
                        <Text style={styles.stepTitle}>Detalhes e Prazos</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Horas Estimadas" 
                            keyboardType="numeric" 
                            value={projectData.estimatedHours} 
                            onChangeText={text => setProjectData(p => ({ ...p, estimatedHours: text }))} 
                        />
                        <Text style={styles.label}>Data de Início (AAAA-MM-DD) *</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Data de Início (AAAA-MM-DD) *" 
                            value={projectData.startDate} 
                            onChangeText={text => setProjectData(p => ({ ...p, startDate: text }))} 
                        />
                        <Text style={styles.label}>Prazo Final (AAAA-MM-DD) *</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Prazo Final (AAAA-MM-DD) *" 
                            value={projectData.deadline} 
                            onChangeText={text => setProjectData(p => ({ ...p, deadline: text }))} 
                        />
                        
                        <Text style={styles.label}>Prioridade *</Text>
                        <View style={styles.priorityContainer}>
                            {[
                                { key: 'low', label: 'Baixa', color: COLORS.success },
                                { key: 'medium', label: 'Média', color: COLORS.warning },
                                { key: 'high', label: 'Alta', color: COLORS.error },
                            ].map(option => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[
                                        styles.priorityOption,
                                        projectData.priority === option.key && {
                                            backgroundColor: option.color + '20',
                                            borderColor: option.color,
                                        }
                                    ]}
                                    onPress={() => setProjectData(p => ({ ...p, priority: option.key as Priority }))}
                                >
                                    <View style={[styles.priorityDot, { backgroundColor: option.color }]} />
                                    <Text style={[styles.priorityText, projectData.priority === option.key && { color: option.color }]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* PASSO 3: EQUIPE */}
                {step === 3 && (
                    <View>
                        <Text style={styles.stepTitle}>Equipe Envolvida</Text>
                        <Text style={styles.stepSubtitle}>Adicione os membros da equipe (opcional)</Text>
                        
                        {projectData.team.map(member => (
                            <View key={member.id} style={styles.memberItem}>
                                <View>
                                    <Text style={styles.memberName}>{member.name}</Text>
                                    <Text style={styles.memberRole}>{member.role}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleRemoveMember(member.id)}>
                                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                                </TouchableOpacity>
                            </View>
                        ))}

                        <View style={styles.addMemberContainer}>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Nome do Membro" 
                                value={memberName} 
                                onChangeText={setMemberName} 
                            />
                            <TextInput 
                                style={styles.input} 
                                placeholder="Função" 
                                value={memberRole} 
                                onChangeText={setMemberRole} 
                            />
                            <TouchableOpacity style={styles.addMemberButton} onPress={handleAddMember}>
                                <Text style={styles.addMemberButtonText}>Adicionar Membro</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                
                {/* NAVEGAÇÃO ENTRE PASSOS */}
                <View style={styles.navigationContainer}>
                    {step > 1 && (
                        <TouchableOpacity 
                            style={[styles.navButton, styles.backButton]} 
                            onPress={() => setStep(s => s - 1)}
                        >
                            <Text style={styles.backButtonText}>Voltar</Text>
                        </TouchableOpacity>
                    )}
                    
                    {step < 3 ? (
                        <TouchableOpacity 
                            style={[styles.navButton, styles.nextButton]} 
                            onPress={handleNextStep}
                        >
                            <Text style={styles.nextButtonText}>Avançar</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.navButton, styles.saveButton]} 
                            onPress={handleSaveProject}
                        >
                            <Text style={styles.saveButtonText}>{editingProject ? 'Atualizar Projeto' : 'Salvar Projeto'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContainer: {
        padding: 16,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: COLORS.gray[800],
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        color: COLORS.gray[500],
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        color: COLORS.gray[700],
    },
    stepSubtitle: {
        fontSize: 14,
        color: COLORS.gray[500],
        marginBottom: 16,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
        color: COLORS.gray[800],
    },
    textArea: {
        height: 96,
        textAlignVertical: 'top',
    },
    label: {
        fontSize: 16,
        color: COLORS.gray[700],
        marginBottom: 8,
        fontWeight: '500',
    },
    statusContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    statusOption: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        backgroundColor: COLORS.white,
    },
    statusOptionActive: {
        backgroundColor: COLORS.primary[500],
        borderColor: COLORS.primary[500],
    },
    statusOptionText: {
        fontSize: 14,
        color: COLORS.gray[600],
    },
    statusOptionTextActive: {
        color: COLORS.white,
        fontWeight: '500',
    },
    priorityContainer: {
        marginBottom: 16,
    },
    priorityOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: COLORS.white,
    },
    priorityDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    priorityText: {
        fontSize: 16,
        color: COLORS.gray[700],
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.gray[200],
    },
    memberName: {
        fontWeight: 'bold',
        fontSize: 16,
        color: COLORS.gray[800],
    },
    memberRole: {
        color: COLORS.gray[500],
        fontSize: 14,
    },
    addMemberContainer: {
        backgroundColor: COLORS.gray[100],
        padding: 16,
        borderRadius: 8,
        marginTop: 16,
    },
    addMemberButton: {
        backgroundColor: COLORS.primary[500],
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    addMemberButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '500',
    },
    navigationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 32,
        gap: 12,
    },
    navButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    backButton: {
        backgroundColor: COLORS.gray[100],
        borderWidth: 1,
        borderColor: COLORS.gray[200],
    },
    nextButton: {
        backgroundColor: COLORS.primary[500],
    },
    saveButton: {
        backgroundColor: COLORS.success,
    },
    backButtonText: {
        color: COLORS.gray[500],
        fontSize: 16,
        fontWeight: '500',
    },
    nextButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '500',
    },
    saveButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '500',
    },
});

export default CreateProjectScreen;