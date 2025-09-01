import { useNavigation } from "@react-navigation/native";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Project, User } from "../../types";

// --- TIPOS CORRIGIDOS PARA COMPATIBILIDADE ---
type Priority = 'high' | 'medium' | 'low';
type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'on_hold';

type TeamMember = {
  id: string;
  name: string;
  role: string;
};

const CreateProjectScreen = () => {
    const navigation = useNavigation();
    const [step, setStep] = useState(1);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const [projectData, setProjectData] = useState({
        name: '',
        company: '',
        description: '',
        estimatedHours: '0',
        deadline: '',
        priority: 'medium' as Priority,
        team: [] as TeamMember[],
    });

    const [memberName, setMemberName] = useState('');
    const [memberRole, setMemberRole] = useState('');

    // Carregar usuário atual ao montar o componente
    useEffect(() => {
        loadCurrentUser();
    }, []);

    const loadCurrentUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('currentUser');
            if (userData) {
                setCurrentUser(JSON.parse(userData));
            } else {
                Alert.alert('Erro', 'Usuário não encontrado. Faça login novamente.');
                // Redirecionar para login se necessário
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
            id: Date.now().toString(),
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
        if (!dateRegex.test(projectData.deadline)) {
            Alert.alert("Formato Inválido", "Use o formato AAAA-MM-DD para o prazo.");
            return;
        }

        try {
            const now = new Date().toISOString();
            const newProject: Project = {
                id: Date.now().toString(), // ID como string
                name: projectData.name.trim(),
                description: projectData.description.trim(),
                progress: 0,
                deadline: projectData.deadline,
                priority: projectData.priority,
                status: 'planning', // Status inicial
                createdAt: now,
                updatedAt: now,
                userId: currentUser.id,
                tasks: [],
                // Campos adicionais
                company: projectData.company.trim() || undefined,
                estimatedHours: parseInt(projectData.estimatedHours) || 0,
                team: projectData.team,
            };

            // Carregar projetos existentes do AsyncStorage
            const storedProjects = await AsyncStorage.getItem('projects');
            const allProjects: Project[] = storedProjects ? JSON.parse(storedProjects) : [];

            // Adicionar novo projeto
            allProjects.push(newProject);
            await AsyncStorage.setItem('projects', JSON.stringify(allProjects));

            Alert.alert('Sucesso', 'Projeto criado com sucesso!', [
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
                if (!projectData.deadline) {
                    Alert.alert('Campo Obrigatório', 'Prazo final é obrigatório.');
                    return false;
                }
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(projectData.deadline)) {
                    Alert.alert("Formato Inválido", "Use o formato AAAA-MM-DD para o prazo.");
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
                <text style={styles.mainTitle}>Novo Projeto</text>
                <text style={styles.subtitle}>Passo {step} de 3</text>


                {/* PASSO 1: INFORMAÇÕES BÁSICAS */}
                {step === 1 && (
                    <View>
                        <text style={styles.stepTitle}>Informações Básicas</text>
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
                    </View>
                )}

                {/* PASSO 2: DETALHES DO PROJETO */}
                {step === 2 && (
                    <View>
                        <text style={styles.stepTitle}>Detalhes e Prazos</text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Horas Estimadas" 
                            keyboardType="numeric" 
                            value={projectData.estimatedHours} 
                            onChangeText={text => setProjectData(p => ({ ...p, estimatedHours: text }))} 
                        />
                        <TextInput 
                            style={styles.input} 
                            placeholder="Prazo Final (AAAA-MM-DD) *" 
                            value={projectData.deadline} 
                            onChangeText={text => setProjectData(p => ({ ...p, deadline: text }))} 
                        />
                        
                        {/* SELETOR DE PRIORIDADE CORRIGIDO */}
                        <text style={styles.label}>Prioridade *</text>
                        <View style={styles.priorityContainer}>
                            {[
                                { key: 'low', label: 'Baixa', color: '#10B981' },
                                { key: 'medium', label: 'Média', color: '#F59E0B' },
                                { key: 'high', label: 'Alta', color: '#EF4444' },
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
                        <text style={styles.stepTitle}>Equipe Envolvida</text>
                        <text style={styles.stepSubtitle}>Adicione os membros da equipe (opcional)</text>
                        
                        {projectData.team.map(member => (
                            <View key={member.id} style={styles.memberItem}>
                                <View>
                                    <text style={styles.memberName}>{member.name}</text>
                                    <text style={styles.memberRole}>{member.role}</text>
                                </View>
                                <TouchableOpacity onPress={() => handleRemoveMember(member.id)}>
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
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
                                <text style={styles.addMemberButtonText}>Adicionar Membro</text>
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
                            <text style={styles.backButtonText}>Voltar</text>
                        </TouchableOpacity>
                    )}
                    
                    {step < 3 ? (
                        <TouchableOpacity 
                            style={[styles.navButton, styles.nextButton]} 
                            onPress={handleNextStep}
                        >
                            <text style={styles.nextButtonText}>Avançar</text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.navButton, styles.saveButton]} 
                            onPress={handleSaveProject}
                        >
                            <text style={styles.saveButtonText}>Salvar Projeto</text>
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
        backgroundColor: '#F9FAFB',
    },
    scrollContainer: {
        padding: 16,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: '#1F2937',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        color: '#6B7280',
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        color: '#374151',
    },
    stepSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    textArea: {
        height: 96,
        textAlignVertical: 'top',
    },
    label: {
        fontSize: 16,
        color: '#4B5563',
        marginBottom: 8,
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
        borderColor: '#E5E7EB',
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
    },
    priorityDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    priorityText: {
        fontSize: 16,
        color: '#374151',
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    memberName: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#1F2937',
    },
    memberRole: {
        color: '#6B7280',
        fontSize: 14,
    },
    addMemberContainer: {
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 8,
        marginTop: 16,
    },
    addMemberButton: {
        backgroundColor: '#3B82F6',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    addMemberButtonText: {
        color: '#FFFFFF',
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
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    nextButton: {
        backgroundColor: '#3B82F6',
    },
    saveButton: {
        backgroundColor: '#10B981',
    },
    backButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '500',
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },
});

export default CreateProjectScreen;