import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Project, Task, TimeLog, User } from '../types';

class ExportService {
    static async generateProjectReport(
        user: User,
        projects: Project[],
        tasks: Task[],
        timeLogs: TimeLog[]
    ) {
        const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório ProjectFy</title>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
            h1 { color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #1f2937; margin-top: 30px; }
            .header { margin-bottom: 40px; }
            .summary { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f3f4f6; padding: 20px; border-radius: 8px; }
            .summary-item { text-align: center; }
            .summary-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
            .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background-color: #f9fafb; font-weight: bold; }
            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .status-planning { background: #e0f2fe; color: #0369a1; }
            .status-in_progress { background: #dbeafe; color: #1d4ed8; }
            .status-completed { background: #dcfce7; color: #15803d; }
            .footer { margin-top: 50px; font-size: 10px; color: #9ca3af; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ProjectFy - Relatório Consolidado</h1>
            <p>Gerado para: <strong>${user.name}</strong></p>
            <p>Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
          </div>

          <div class="summary">
            <div class="summary-item">
              <div class="summary-value">${projects.length}</div>
              <div class="summary-label">Projetos</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${tasks.length}</div>
              <div class="summary-label">Tarefas</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${(timeLogs.reduce((acc, log) => acc + log.duration, 0) / 3600).toFixed(1)}h</div>
              <div class="summary-label">Horas Totais</div>
            </div>
          </div>

          <h2>Lista de Projetos</h2>
          <table>
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Empresa</th>
                <th>Status</th>
                <th>Progresso</th>
                <th>Prazo</th>
              </tr>
            </thead>
            <tbody>
              ${projects.map(p => `
                <tr>
                  <td>${p.name}</td>
                  <td>${p.company || '-'}</td>
                  <td>${p.status}</td>
                  <td>${p.progress}%</td>
                  <td>${new Date(p.deadline).toLocaleDateString('pt-BR')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            Este relatório foi gerado automaticamente pelo aplicativo ProjectFy.
          </div>
        </body>
      </html>
    `;

        try {
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            throw error;
        }
    }
}

export default ExportService;
