export default function templateTaskReportEmployee(data: {
  employeeName: string;
  reportDate: string;
  tasks: Array<{
    dueDate: string;
    title: string;
    priority: string;
    role: string;
    isOverdue: boolean;
  }>;
  totalTasks: number;
}) {
  const priorityColors: { [key: string]: string } = {
    LOW: '#28a745',
    MEDIUM: '#ffc107',
    HIGH: '#fd7e14',
    URGENT: '#dc3545',
  };

  const priorityLabels: { [key: string]: string } = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    HIGH: 'Alta',
    URGENT: 'Urgente',
  };

  const taskRows = data.tasks
    .map((task) => {
      const priorityColor = priorityColors[task.priority] || '#6c757d';
      const priorityLabel = priorityLabels[task.priority] || task.priority;
      const rowBg = task.isOverdue ? '#fff5f5' : '#ffffff';
      const dateColor = task.isOverdue ? '#dc3545' : '#333333';

      return `
        <tr style="background-color: ${rowBg};">
          <td style="padding: 12px; border: 1px solid #dee2e6; color: ${dateColor}; font-weight: ${task.isOverdue ? 'bold' : 'normal'};">
            ${task.dueDate}${task.isOverdue ? ' ⚠️' : ''}
          </td>
          <td style="padding: 12px; border: 1px solid #dee2e6; color: #333333;">
            ${task.title}
          </td>
          <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center;">
            <span style="background-color: ${priorityColor}; color: #ffffff; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
              ${priorityLabel}
            </span>
          </td>
          <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center; color: #333333;">
            ${task.role}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Suas Tarefas Pendentes - ${data.reportDate}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="800" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">
                              📋 Suas Tarefas Pendentes
                            </h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
                              ${data.reportDate}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <div style="margin-bottom: 25px;">
                                <h2 style="color: #333333; margin: 0 0 10px 0; font-size: 18px;">
                                  Olá, ${data.employeeName}
                                </h2>
                                <p style="color: #666666; line-height: 1.6; margin: 10px 0;">
                                  Você possui <strong>${data.totalTasks} tarefa(s) pendente(s)</strong> para concluir.
                                </p>
                            </div>

                            <!-- Legenda -->
                            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #667eea;">
                              <p style="margin: 0; color: #666666; font-size: 13px;">
                                <strong>Legenda:</strong> ⚠️ = Tarefa vencida | 
                                <span style="color: #28a745;">●</span> Baixa | 
                                <span style="color: #ffc107;">●</span> Média | 
                                <span style="color: #fd7e14;">●</span> Alta | 
                                <span style="color: #dc3545;">●</span> Urgente
                              </p>
                            </div>

                            <!-- Tabela de Tarefas -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 20px 0;">
                              <thead>
                                <tr style="background-color: #667eea;">
                                  <th style="padding: 12px; border: 1px solid #667eea; color: #ffffff; text-align: left; font-weight: bold;">
                                    Data de Vencimento
                                  </th>
                                  <th style="padding: 12px; border: 1px solid #667eea; color: #ffffff; text-align: left; font-weight: bold;">
                                    Título
                                  </th>
                                  <th style="padding: 12px; border: 1px solid #667eea; color: #ffffff; text-align: center; font-weight: bold;">
                                    Prioridade
                                  </th>
                                  <th style="padding: 12px; border: 1px solid #667eea; color: #ffffff; text-align: center; font-weight: bold;">
                                    Papel
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                ${taskRows}
                              </tbody>
                            </table>

                            <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 6px;">
                              <p style="color: #666666; margin: 0; font-size: 14px; line-height: 1.6;">
                                <strong>Total de tarefas:</strong> ${data.totalTasks}<br>
                                <strong>Tarefas vencidas:</strong> ${data.tasks.filter((t) => t.isOverdue).length}<br>
                                <strong>Tarefas no prazo:</strong> ${data.tasks.filter((t) => !t.isOverdue).length}
                              </p>
                            </div>

                            ${
                              data.tasks.some((t) => t.isOverdue)
                                ? `
                            <div style="margin-top: 20px; padding: 15px; background-color: #fff5f5; border-radius: 6px; border-left: 4px solid #dc3545;">
                              <p style="color: #dc3545; margin: 0; font-size: 14px; font-weight: bold;">
                                ⚠️ Atenção: Você possui tarefas vencidas que precisam de atenção imediata!
                              </p>
                            </div>
                            `
                                : ''
                            }
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #666666; margin: 0; font-size: 13px;">
                              Este é um email automático. Por favor, não responda.
                            </p>
                            <p style="color: #999999; margin: 10px 0 0 0; font-size: 12px;">
                              Sistema de Gestão de Tarefas
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
}



























