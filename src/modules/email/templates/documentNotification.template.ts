export default function templateDocumentNotification(data: {
  companyName: string;
  fileName: string;
  year: number;
  month: string;
  loginUrl: string;
}) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Novo Documento Disponível</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #5e1618; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Novo Documento Disponível</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Sua pasta de documentos foi atualizada</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <div style="margin-bottom: 25px;">
                                <h2 style="color: #5e1618; margin: 0 0 20px 0; font-size: 18px; font-weight: bold;">Olá, ${data.companyName},</h2>
                                
                                <p style="color: #333333; line-height: 1.6; margin: 15px 0;">
                                    Informamos que um novo documento foi disponibilizado em sua pasta de documentos.
                                </p>
                            </div>

                            <div style="background-color: #f9eeee; padding: 25px; border-radius: 6px; border-left: 4px solid #5e1618; margin: 25px 0;">
                                <h3 style="color: #5e1618; margin: 0 0 20px 0; font-size: 16px; font-weight: bold;">Detalhes do Documento:</h3>
                                
                                <ul style="color: #333333; line-height: 1.8; margin: 0; padding-left: 20px; list-style: disc;">
                                    <li style="margin-bottom: 10px;"><strong>Nome do arquivo:</strong> ${data.fileName}</li>
                                    <li style="margin-bottom: 10px;"><strong>Período:</strong> ${data.month} de ${data.year}</li>
                                </ul>
                            </div>

                            <div style="background-color: #5e1618; padding: 25px; border-radius: 6px; margin: 25px 0; text-align: center;">
                                <p style="color: #ffffff; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                                    Para acessar seus documentos, clique no botão abaixo:
                                </p>
                                <a href="${data.loginUrl}" style="display: inline-block; background-color: #ffffff; color: #5e1618; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                    Acessar Plataforma
                                </a>
                            </div>

                            <p style="color: #333333; line-height: 1.6; margin: 20px 0;">
                                Ou copie e cole o link abaixo no seu navegador:
                            </p>
                            <p style="color: #5e1618; line-height: 1.6; margin: 10px 0; word-break: break-all;">
                                ${data.loginUrl}
                            </p>

                            <div style="background-color: #FFF7E0; padding: 20px; border-radius: 6px; border-left: 4px solid #FFBF00; margin: 25px 0;">
                                <p style="color: #856404; line-height: 1.6; margin: 0; font-size: 14px;">
                                    <strong>💡 Dica:</strong> Você pode configurar até 5 emails para receber notificações automáticas sempre que novos documentos forem adicionados à sua pasta.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; border-top: 1px solid #e9ecef;">
                            <div style="text-align: center;">
                                <h4 style="color: #5e1618; margin: 0 0 15px 0; font-size: 16px;">Atenciosamente,</h4>
                                <div style="color: #333333; line-height: 1.5;">
                                    <p style="margin: 5px 0; font-weight: bold; font-size: 16px;">Equipe ${process.env.COMPANY_NAME || 'Naciopetro'}</p>
                                </div>
                            </div>
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

