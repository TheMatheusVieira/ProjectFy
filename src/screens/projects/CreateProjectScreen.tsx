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
import uuid from 'react-native-uuid';

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

    const formatDateToBR = (date: string) => {
        if (!date) return '';
        if (date.includes('/')) return date;
        const [year, month, day] = date.split('-');
        return `${day}/${month}/${year}`;
    };

    const formatDateToISO = (date: string) => {
        if (!date) return '';
        const [day, month, year] = date.split('/');
        return `${year}-${month}-${day}`;
    };

    const applyDateMask = (text: string) => {
        // Remove tudo que não for número
        const cleaned = text.replace(/\D/g, '');
        
        // Aplica a máscara DD/MM/AAAA
        let masked = cleaned;
        if (cleaned.length > 2) {
            masked = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
        }
        if (cleaned.length > 4) {
            masked = masked.substring(0, 5) + '/' + masked.substring(5, 9);
        }
        return masked;
    };

    const [projectData, setProjectData] = useState({
        name: editingProject?.name || '',
        company: editingProject?.company || '',
        description: editingProject?.description || '',
        estimatedHours: editingProject?.estimatedHours?.toString() || '0',
        startDate: editingProject ? formatDateToBR(editingProject.startDate) : formatDateToBR(new Date().toISOString().split('T')[0]),
        deadline: editingProject ? formatDateToBR(editingProject.deadline) : '',
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
            id: uuid.v4() as string,
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

        // Validar formato da data (DD/MM/AAAA)
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!dateRegex.test(projectData.deadline) || !dateRegex.test(projectData.startDate)) {
            Alert.alert("Formato Inválido", "Use o formato DD/MM/AAAA para as datas.");
            return;
        }

        try {
            const now = new Date().toISOString();
            const project: Project = {
                id: editingProject?.id || uuid.v4() as string,
                name: projectData.name.trim(),
                description: projectData.description.trim(),
                progress: editingProject?.progress || 0,
                startDate: formatDateToISO(projectData.startDate),
                deadline: formatDateToISO(projectData.deadline),
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
                const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
                if (!dateRegex.test(projectData.deadline) || !dateRegex.test(projectData.startDate)) {
                    Alert.alert("Formato Inválido", "Use o formato DD/MM/AAAA para as datas.");
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

    const renderProgressIndicator = () => (
        <View style={styles.progressContainer}>
            <View style={styles.stepsRow}>
                {[1, 2, 3].map((s) => (
                    <React.Fragment key={s}>
                        <View style={[
                            styles.stepCircle,
                            step >= s ? styles.stepCircleActive : styles.stepCircleInactive
                        ]}>
                            {step > s ? (
                                <Ionicons name="checkmark" size={16} color={COLORS.white} />
                            ) : (
                                <Text style={[
                                    styles.stepNumber,
                                    step >= s ? styles.stepNumberActive : styles.stepNumberInactive
                                ]}>{s}</Text>
                            )}
                        </View>
                        {s < 3 && <View style={[
                            styles.stepLine,
                            step > s ? styles.stepLineActive : styles.stepLineInactive
                        ]} />}
                    </React.Fragment>
                ))}
            </View>
            <View style={styles.stepsLabels}>
                <Text style={[styles.stepLabel, step >= 1 && styles.stepLabelActive]}>Básico</Text>
                <Text style={[styles.stepLabel, step >= 2 && styles.stepLabelActive]}>Prazos</Text>
                <Text style={[styles.stepLabel, step >= 3 && styles.stepLabelActive]}>Equipe</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.mainTitle}>{editingProject ? 'Editar projeto' : 'Novo projeto'}</Text>
                    <Text style={styles.subtitle}>
                        {step === 1 && "Informações principais do projeto"}
                        {step === 2 && "Configure o tempo e prioridade"}
                        {step === 3 && "Quem fará parte da jornada?"}
                    </Text>
                </View>

                {renderProgressIndicator()}

                <View style={styles.card}>
                    {/* PASSO 1: INFORMAÇÕES BÁSICAS */}
                    {step === 1 && (
                        <View>
                            <Text style={styles.sectionTitle}>Resumo do projeto</Text>
                            
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Nome do projeto *</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="briefcase-outline" size={20} color={COLORS.gray[400]} style={styles.inputIcon} />
                                    <TextInput 
                                        style={styles.input} 
                                        placeholder="Ex: App ProjectFy"
                                        placeholderTextColor={COLORS.gray[300]}
                                        value={projectData.name} 
                                        onChangeText={text => setProjectData(p => ({ ...p, name: text }))} 
                                    />
                                </View>
                            </View>

                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Empresa / Cliente</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="business-outline" size={20} color={COLORS.gray[400]} style={styles.inputIcon} />
                                    <TextInput 
                                        style={styles.input} 
                                        placeholder="Nome da empresa"
                                        placeholderTextColor={COLORS.gray[300]}
                                        value={projectData.company} 
                                        onChangeText={text => setProjectData(p => ({ ...p, company: text }))} 
                                    />
                                </View>
                            </View>

                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Descrição *</Text>
                                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                                    <Ionicons name="reader-outline" size={20} color={COLORS.gray[400]} style={[styles.inputIcon, { marginTop: 12 }]} />
                                    <TextInput 
                                        style={[styles.input, styles.textArea]} 
                                        placeholder="Descreva os objetivos do projeto..."
                                        placeholderTextColor={COLORS.gray[300]}
                                        multiline 
                                        value={projectData.description} 
                                        onChangeText={text => setProjectData(p => ({ ...p, description: text }))} 
                                    />
                                </View>
                            </View>
                            
                            {editingProject && (
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.inputLabel}>Status Atual</Text>
                                    <View style={styles.statusGrid}>
                                        {[
                                            { key: 'planning', label: 'Planejamento', icon: 'map-outline' },
                                            { key: 'in_progress', label: 'Em Andamento', icon: 'play-outline' },
                                            { key: 'completed', label: 'Concluído', icon: 'checkmark-circle-outline' },
                                            { key: 'on_hold', label: 'Pausado', icon: 'pause-outline' },
                                        ].map(option => (
                                            <TouchableOpacity
                                                key={option.key}
                                                style={[
                                                    styles.statusPill,
                                                    projectData.status === option.key && styles.statusPillActive
                                                ]}
                                                onPress={() => setProjectData(p => ({ ...p, status: option.key as ProjectStatus }))}
                                            >
                                                <Ionicons 
                                                    name={option.icon as any} 
                                                    size={16} 
                                                    color={projectData.status === option.key ? COLORS.white : COLORS.gray[500]} 
                                                />
                                                <Text style={[
                                                    styles.statusPillText,
                                                    projectData.status === option.key && styles.statusPillTextActive
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
                            <Text style={styles.sectionTitle}>Prazos e prioridade</Text>
                            
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Estimativa de horas</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="time-outline" size={20} color={COLORS.gray[400]} style={styles.inputIcon} />
                                    <TextInput 
                                        style={styles.input} 
                                        placeholder="0"
                                        keyboardType="numeric" 
                                        value={projectData.estimatedHours} 
                                        onChangeText={text => setProjectData(p => ({ ...p, estimatedHours: text }))} 
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.inputLabel}>Data Início *</Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput 
                                            style={styles.input} 
                                            placeholder="DD/MM/AAAA"
                                            placeholderTextColor={COLORS.gray[300]}
                                            keyboardType="numeric"
                                            maxLength={10}
                                            value={projectData.startDate} 
                                            onChangeText={text => setProjectData(p => ({ ...p, startDate: applyDateMask(text) }))} 
                                        />
                                    </View>
                                </View>
                                <View style={[styles.inputWrapper, { flex: 1, marginLeft: 8 }]}>
                                    <Text style={styles.inputLabel}>Prazo Final *</Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput 
                                            style={styles.input} 
                                            placeholder="DD/MM/AAAA"
                                            placeholderTextColor={COLORS.gray[300]}
                                            keyboardType="numeric"
                                            maxLength={10}
                                            value={projectData.deadline} 
                                            onChangeText={text => setProjectData(p => ({ ...p, deadline: applyDateMask(text) }))} 
                                        />
                                    </View>
                                </View>
                            </View>
                            
                            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Prioridade do Projeto *</Text>
                            <View style={styles.priorityGrid}>
                                {[
                                    { key: 'low', label: 'Baixa', color: COLORS.success, icon: 'arrow-down-circle' },
                                    { key: 'medium', label: 'Média', color: COLORS.warning, icon: 'remove-circle' },
                                    { key: 'high', label: 'Alta', color: COLORS.error, icon: 'arrow-up-circle' },
                                ].map(option => (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[
                                            styles.priorityCard,
                                            projectData.priority === option.key && {
                                                borderColor: option.color,
                                                backgroundColor: option.color + '10',
                                            }
                                        ]}
                                        onPress={() => setProjectData(p => ({ ...p, priority: option.key as Priority }))}
                                    >
                                        <Ionicons 
                                            name={option.icon as any} 
                                            size={24} 
                                            color={projectData.priority === option.key ? option.color : COLORS.gray[300]} 
                                        />
                                        <Text style={[
                                            styles.priorityCardText,
                                            projectData.priority === option.key && { color: option.color, fontWeight: '700' }
                                        ]}>
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
                            <Text style={styles.sectionTitle}>Membros da Equipe</Text>
                            
                            {projectData.team.length > 0 ? (
                                <View style={styles.teamList}>
                                    {projectData.team.map(member => (
                                        <View key={member.id} style={styles.memberCard}>
                                            <View style={styles.memberAvatar}>
                                                <Text style={styles.avatarText}>{member.name.charAt(0).toUpperCase()}</Text>
                                            </View>
                                            <View style={styles.memberInfo}>
                                                <Text style={styles.memberName}>{member.name}</Text>
                                                <Text style={styles.memberRole}>{member.role}</Text>
                                            </View>
                                            <TouchableOpacity 
                                                style={styles.removeMemberBtn}
                                                onPress={() => handleRemoveMember(member.id)}
                                            >
                                                <Ionicons name="close-circle" size={22} color={COLORS.error} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.emptyTeamCard}>
                                    <Ionicons name="people-outline" size={40} color={COLORS.gray[200]} />
                                    <Text style={styles.emptyTeamText}>Nenhum membro adicionado</Text>
                                </View>
                            )}

                            <View style={styles.addMemberForm}>
                                <Text style={styles.addSubTitle}>Adicionar Novo Membro</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="person-outline" size={20} color={COLORS.gray[400]} style={styles.inputIcon} />
                                    <TextInput 
                                        style={styles.input} 
                                        placeholder="Nome" 
                                        value={memberName} 
                                        onChangeText={setMemberName} 
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="ribbon-outline" size={20} color={COLORS.gray[400]} style={styles.inputIcon} />
                                    <TextInput 
                                        style={styles.input} 
                                        placeholder="Função (ex: Designer)" 
                                        value={memberRole} 
                                        onChangeText={setMemberRole} 
                                    />
                                </View>
                                <TouchableOpacity style={styles.addMemberButton} onPress={handleAddMember}>
                                    <Ionicons name="add" size={20} color={COLORS.white} />
                                    <Text style={styles.addMemberButtonText}>Adicionar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* NAVEGAÇÃO ENTRE PASSOS */}
                <View style={styles.navigationContainer}>
                    {step > 1 ? (
                        <TouchableOpacity 
                            style={[styles.navButton, styles.backButton]} 
                            onPress={() => setStep(s => s - 1)}
                        >
                            <Ionicons name="arrow-back" size={20} color={COLORS.gray[600]} />
                            <Text style={styles.backButtonText}>Voltar</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.navButton, styles.backButton]} 
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.backButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                    )}
                    
                    {step < 3 ? (
                        <TouchableOpacity 
                            style={[styles.navButton, styles.nextButton]} 
                            onPress={handleNextStep}
                        >
                            <Text style={styles.nextButtonText}>Próximo</Text>
                            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.navButton, styles.saveButton]} 
                            onPress={handleSaveProject}
                        >
                            <Ionicons name="cloud-upload-outline" size={20} color={COLORS.white} />
                            <Text style={styles.saveButtonText}>{editingProject ? 'Atualizar' : 'Finalizar'}</Text>
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
        backgroundColor: COLORS.gray[50],
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.gray[900],
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.gray[500],
    },
    progressContainer: {
        marginBottom: 32,
    },
    stepsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    stepCircleActive: {
        backgroundColor: COLORS.primary[500],
        borderColor: COLORS.primary[500],
    },
    stepCircleInactive: {
        backgroundColor: COLORS.white,
        borderColor: COLORS.gray[200],
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    stepNumberActive: {
        color: COLORS.white,
    },
    stepNumberInactive: {
        color: COLORS.gray[400],
    },
    stepLine: {
        width: 40,
        height: 2,
        marginHorizontal: 4,
    },
    stepLineActive: {
        backgroundColor: COLORS.primary[500],
    },
    stepLineInactive: {
        backgroundColor: COLORS.gray[200],
    },
    stepsLabels: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 28,
    },
    stepLabel: {
        fontSize: 12,
        color: COLORS.gray[400],
        fontWeight: '500',
    },
    stepLabelActive: {
        color: COLORS.primary[500],
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 24,
        ...THEME.shadows.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.gray[800],
        marginBottom: 20,
    },
    inputWrapper: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.gray[700],
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.gray[50],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.gray[100],
        paddingHorizontal: 12,
        height: 52,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: COLORS.gray[800],
    },
    textAreaContainer: {
        height: 120,
        alignItems: 'flex-start',
    },
    textArea: {
        height: '100%',
        paddingTop: 12,
        textAlignVertical: 'top',
    },
    statusGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        backgroundColor: COLORS.white,
        gap: 6,
    },
    statusPillActive: {
        backgroundColor: COLORS.primary[500],
        borderColor: COLORS.primary[500],
    },
    statusPillText: {
        fontSize: 13,
        color: COLORS.gray[600],
        fontWeight: '500',
    },
    statusPillTextActive: {
        color: COLORS.white,
    },
    row: {
        flexDirection: 'row',
    },
    priorityGrid: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    priorityCard: {
        flex: 1,
        height: 80,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: COLORS.gray[100],
        backgroundColor: COLORS.gray[50],
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    priorityCardText: {
        fontSize: 13,
        color: COLORS.gray[400],
        fontWeight: '600',
    },
    teamList: {
        marginBottom: 24,
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.gray[100],
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: COLORS.primary[700],
        fontWeight: 'bold',
        fontSize: 16,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.gray[800],
    },
    memberRole: {
        fontSize: 13,
        color: COLORS.gray[500],
    },
    removeMemberBtn: {
        padding: 4,
    },
    emptyTeamCard: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.gray[50],
        borderRadius: 12,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: COLORS.gray[100],
        marginBottom: 24,
    },
    emptyTeamText: {
        fontSize: 14,
        color: COLORS.gray[400],
        marginTop: 8,
    },
    addMemberForm: {
        backgroundColor: COLORS.gray[50],
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    addSubTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.gray[700],
        marginBottom: 4,
    },
    addMemberButton: {
        backgroundColor: COLORS.primary[500],
        flexDirection: 'row',
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    addMemberButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    navigationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 32,
        gap: 16,
    },
    navButton: {
        flex: 1,
        flexDirection: 'row',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        ...THEME.shadows.sm,
    },
    backButton: {
        backgroundColor: COLORS.white,
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
        color: COLORS.gray[600],
        fontSize: 16,
        fontWeight: 'bold',
    },
    nextButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    saveButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CreateProjectScreen;