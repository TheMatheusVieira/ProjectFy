import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react"; // Importe o React
import { 
    SafeAreaView, 
    ScrollView, 
    View, 
    Text, 
    TextInput, 
    Button, 
    TouchableOpacity, 
    StyleSheet, 
    Alert 
} from "react-native";
import { Ionicons } from '@expo/vector-icons';

// --- DEFINIÇÃO DOS TIPOS ---
// (Coloque isso em um arquivo types.ts ou mantenha aqui)
type Priority = 'high' | 'medium' | 'low';

type TeamMember = {
  id: string;
  name: string;
  role: string;
};

type Project = {
  id: number;
  progress: number;
  name: string;
  company?: string;
  description: string;
  estimatedHours: number;
  deadline: string;
  priority: Priority;
  team: TeamMember[];
};
// --- FIM DA DEFINIÇÃO DOS TIPOS ---


const CreateProjectScreen = () => {
    // 1. TODA A LÓGICA DEVE ESTAR DENTRO DO COMPONENTE
    const navigation = useNavigation();
    const [step, setStep] = useState(1);

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

    const handleAddMember = () => {
        if (!memberName.trim() || !memberRole.trim()) return;
        const newMember: TeamMember = {
            id: Date.now().toString(),
            name: memberName,
            role: memberRole,
        };
        // Corrigido: a função de atualização de estado deve estar aqui dentro
        setProjectData(prev => ({ ...prev, team: [...prev.team, newMember] }));
        setMemberName('');
        setMemberRole('');
    };

    const handleRemoveMember = (id: string) => {
        // 2. LÓGICA DE REMOÇÃO CORRIGIDA
        setProjectData(prev => ({
            ...prev,
            // A lógica correta é filtrar mantendo os membros cujo id é DIFERENTE do id a ser removido
            team: prev.team.filter(member => member.id !== id),
        }));
    };

    const handleSaveProject = () => {
        if (!projectData.name || !projectData.deadline || !projectData.description) {
            Alert.alert("Campos Obrigatórios", "Nome, descrição e prazo são necessários.");
            return;
        }

        const newProject: Project = {
            id: Date.now(),
            progress: 0,
            ...projectData,
            estimatedHours: parseInt(projectData.estimatedHours) || 0,
        };

        // @ts-ignore - para evitar erro de tipo caso a navegação não esteja totalmente tipada
        navigation.navigate('Projects', { newProject });
    };

    // 3. O RETURN COM O JSX DEVE ESTAR DENTRO DO COMPONENTE
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.mainTitle}>Novo Projeto</Text>
                <Text style={styles.subtitle}>Passo {step} de 3</Text>
                
                {/* PASSO 1: INFORMAÇÕES BÁSICAS */}
                {step === 1 && (
                    <View>
                        <Text style={styles.stepTitle}>Informações Básicas</Text>
                        <TextInput style={styles.input} placeholder="Nome do Projeto *" value={projectData.name} onChangeText={text => setProjectData(p => ({ ...p, name: text }))} />
                        <TextInput style={styles.input} placeholder="Empresa / Cliente" value={projectData.company} onChangeText={text => setProjectData(p => ({ ...p, company: text }))} />
                        <TextInput style={[styles.input, styles.textArea]} placeholder="Descrição do Projeto *" multiline value={projectData.description} onChangeText={text => setProjectData(p => ({ ...p, description: text }))} />
                    </View>
                )}

                {/* PASSO 2: DETALHES DO PROJETO */}
                {step === 2 && (
                    <View>
                        <Text style={styles.stepTitle}>Detalhes e Prazos</Text>
                        <TextInput style={styles.input} placeholder="Horas Estimadas" keyboardType="numeric" value={projectData.estimatedHours} onChangeText={text => setProjectData(p => ({ ...p, estimatedHours: text }))} />
                        <TextInput style={styles.input} placeholder="Prazo Final (AAAA-MM-DD) *" value={projectData.deadline} onChangeText={text => setProjectData(p => ({ ...p, deadline: text }))} />
                        <Text style={styles.label}>Prioridade</Text>
                        {/* ... Coloque seu seletor de prioridade aqui ... */}
                    </View>
                )}

                {/* PASSO 3: EQUIPE */}
                {step === 3 && (
                    <View>
                        <Text style={styles.stepTitle}>Equipe Envolvida</Text>
                        {projectData.team.map(member => (
                            <View key={member.id} style={styles.memberItem}>
                                <View>
                                    <Text style={styles.memberName}>{member.name}</Text>
                                    <Text style={styles.memberRole}>{member.role}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleRemoveMember(member.id)}>
                                    <Ionicons name="trash-outline" size={20} color="red" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        <View style={styles.addMemberContainer}>
                            <TextInput style={styles.input} placeholder="Nome do Membro" value={memberName} onChangeText={setMemberName} />
                            <TextInput style={styles.input} placeholder="Função" value={memberRole} onChangeText={setMemberRole} />
                            <Button title="Adicionar Membro" onPress={handleAddMember} />
                        </View>
                    </View>
                )}
                
                {/* NAVEGAÇÃO ENTRE PASSOS */}
                <View style={styles.navigationContainer}>
                    {step > 1 ? <Button title="Voltar" onPress={() => setStep(s => s - 1)} /> : <View />}
                    {step < 3 ? <Button title="Avançar" onPress={() => setStep(s => s + 1)} /> : <Button title="Salvar Projeto" onPress={handleSaveProject} />}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

// ... (seu objeto StyleSheet permanece o mesmo)
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
  },
  memberRole: {
    color: '#4B5563',
  },
  addMemberContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
});

export default CreateProjectScreen;