export default function templateLeadConfirmation(leadData: {
  name: string;
  interestService: string;
}) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Re: Interesse em ${leadData.interestService}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #002d1b; padding: 30px; text-align: center;">
                            
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Obrigado pelo seu contato!</h1>
                            <p style="color: #fdc41f; margin: 10px 0 0 0; font-size: 14px;">Confirmação de recebimento</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <div style="margin-bottom: 25px;">
                                <h2 style="color: #002d1b; margin: 0 0 20px 0; font-size: 18px; font-weight: bold;">Olá, ${leadData.name},</h2>
                                
                                <p style="color: #333333; line-height: 1.6; margin: 15px 0;">
                                    Agradecemos pelo seu contato e pelo interesse em nosso <strong>${leadData.interestService}</strong>.
                                </p>
                            </div>

                            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 6px; border-left: 4px solid #fdc41f; margin: 25px 0;">
                                <h3 style="color: #002d1b; margin: 0 0 20px 0; font-size: 16px; font-weight: bold;">Recebemos suas informações corretamente:</h3>
                                
                                <ul style="color: #333333; line-height: 1.6; margin: 0; padding-left: 20px; list-style: disc;">
                                    <li style="margin-bottom: 10px;"><strong>Tipo de pessoa:</strong> Pessoa Jurídica</li>
                                    <li style="margin-bottom: 10px;"><strong>Serviço de interesse:</strong> ${leadData.interestService}</li>
                                </ul>
                            </div>

                            <div style="background-color: #002d1b; padding: 25px; border-radius: 6px; margin: 25px 0;">
                                <p style="color: #ffffff; line-height: 1.6; margin: 0 0 15px 0; font-size: 16px;">
                                    Sua mensagem foi registrada e um profissional da nossa equipe entrará em contato em breve para dar continuidade ao seu atendimento.
                                </p>
                                <div style="background-color: rgba(253, 196, 31, 0.1); padding: 15px; border-radius: 4px;">
                                    <p style="color: #fdc41f; line-height: 1.6; margin: 0; font-weight: bold; text-align: center;">
                                        ⏰ Tempo estimado de resposta: até 24 horas
                                    </p>
                                </div>
                            </div>

                            <p style="color: #333333; line-height: 1.6; margin: 20px 0;">
                                Enquanto isso, caso queira complementar alguma informação, basta responder a este e-mail.
                            </p>

                            <div style="background-color: #fdc41f; padding: 20px; border-radius: 6px; margin: 25px 0; text-align: center;">
                                <p style="color: #002d1b; line-height: 1.6; margin: 0; font-weight: bold; font-size: 16px;">
                                    Obrigado pela confiança.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; border-top: 1px solid #e9ecef;">
                            <div style="text-align: center;">
                                <h4 style="color: #002d1b; margin: 0 0 15px 0; font-size: 16px;">Atenciosamente,</h4>
                                <div style="color: #333333; line-height: 1.5;">
                                    <p style="margin: 5px 0; font-weight: bold; font-size: 16px;">Equipe Naciopetro</p>
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
