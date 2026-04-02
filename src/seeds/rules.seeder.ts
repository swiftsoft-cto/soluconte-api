import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Rule } from 'src/modules/rules/entities.rules.entity';

@Injectable()
export default class RulesSeeder {
  constructor(private readonly dataSource: DataSource) {}

  public async run() {
    const ruleRepository = this.dataSource.getRepository(Rule);

    const rulesData = [
      { id: 'team', name: 'Atribui um usuário à equipe adm', rule: 'team' },

      {
        id: '1',
        name: 'Tem permissão para acessar qualquer recurso',
        rule: 'administrator',
      },
      { id: '2', name: 'Inserir novos usuários', rule: 'users.create' },
      { id: '3', name: 'Visualizar usuários', rule: 'users.paginate' },
      { id: '254', name: 'Selecionar usuários em formulários', rule: 'users.select' },
      { id: '4', name: 'Excluir usuário', rule: 'users.delete' },
      { id: '5', name: 'Editar usuário', rule: 'users.update' },
      {
        id: '6',
        name: 'Visualizar detalhes do usuário',
        rule: 'users.findOne',
      },
      {
        id: '7',
        name: 'Visualizar informações de perfil próprio',
        rule: 'users.getMyProfile',
      },
      {
        id: '8',
        name: 'Atualizar informações de perfil próprio',
        rule: 'users.updateMe',
      },
      { id: '9', name: 'Editar a própria senha', rule: 'users.changePassword' },

      { id: '10', name: 'Inserir novo cargo', rule: 'roles.create' },
      { id: '11', name: 'Visualizar todos os cargos', rule: 'roles.findAll' },
      { id: '12', name: 'Visualizar cargos paginados', rule: 'roles.paginate' },
      { id: '13', name: 'Visualizar detalhes do cargo', rule: 'roles.findOne' },
      { id: '14', name: 'Editar cargo', rule: 'roles.update' },
      { id: '15', name: 'Excluir cargo', rule: 'roles.delete' },

      {
        id: '16',
        name: 'Inserir novo departamento',
        rule: 'departments.create',
      },
      {
        id: '17',
        name: 'Visualizar todos os departamentos',
        rule: 'departments.findAll',
      },
      {
        id: '251',
        name: 'Visualizar departamentos paginados',
        rule: 'departments.paginate',
      },
      {
        id: '253',
        name: 'Selecionar departamentos em formulários',
        rule: 'departments.select',
      },
      {
        id: '18',
        name: 'Visualizar detalhes do departamento',
        rule: 'departments.findOne',
      },
      { id: '19', name: 'Editar departamento', rule: 'departments.update' },
      { id: '20', name: 'Excluir departamento', rule: 'departments.delete' },

      {
        id: '21',
        name: 'Visualizar detalhes da empresa',
        rule: 'company.findOne',
      },
      {
        id: '22',
        name: 'Editar as informações da empresa',
        rule: 'company.update',
      },
      {
        id: '40',
        name: 'Visualizar todas as empresa',
        rule: 'company.findAll',
      },

      { id: '23', name: 'Visualizar permissões', rule: 'role-rule.findAll' },
      { id: '24', name: 'Editar Permissões', rule: 'role-rule.update' },

      { id: '25', name: 'Criar Serviço', rule: 'services.create' },
      { id: '26', name: 'Editar Serviço', rule: 'services.update' },
      { id: '27', name: 'Ver todos os serviços', rule: 'services.findAll' },
      { id: '28', name: 'Ver detalhes do serviço', rule: 'services.findOne' },
      { id: '36', name: 'Remover um serviço', rule: 'services.remove' },
      {
        id: '37',
        name: 'Atribuir serviço à empresa',
        rule: 'company-services.create',
      },
      {
        id: '38',
        name: 'Ver todos os serviços atribuídos à empresa',
        rule: 'company-services.findAll',
      },
      {
        id: '39',
        name: 'Remover atribuição de serviço',
        rule: 'company-services.remove',
      },

      // CRM Companies Rules
      { id: '41', name: 'Criar empresa CRM', rule: 'crm-companies.create' },
      { id: '42', name: 'Listar empresas CRM', rule: 'crm-companies.paginate' },
      {
        id: '43',
        name: 'Visualizar empresa CRM',
        rule: 'crm-companies.findOne',
      },
      { id: '44', name: 'Atualizar empresa CRM', rule: 'crm-companies.update' },
      { id: '45', name: 'Excluir empresa CRM', rule: 'crm-companies.delete' },

      // CRM Contacts Rules
      { id: '46', name: 'Criar contato CRM', rule: 'crm-contacts.create' },
      { id: '47', name: 'Listar contatos CRM', rule: 'crm-contacts.paginate' },
      {
        id: '48',
        name: 'Visualizar contato CRM',
        rule: 'crm-contacts.findOne',
      },
      { id: '49', name: 'Atualizar contato CRM', rule: 'crm-contacts.update' },
      { id: '50', name: 'Excluir contato CRM', rule: 'crm-contacts.delete' },

      // CRM Teams Rules
      { id: '51', name: 'Criar time CRM', rule: 'crm-teams.create' },
      { id: '52', name: 'Listar times CRM', rule: 'crm-teams.paginate' },
      { id: '53', name: 'Visualizar time CRM', rule: 'crm-teams.findOne' },
      { id: '54', name: 'Atualizar time CRM', rule: 'crm-teams.update' },
      { id: '55', name: 'Excluir time CRM', rule: 'crm-teams.delete' },
      { id: '56', name: 'Criar funil CRM', rule: 'crm-funnels.create' },
      { id: '57', name: 'Listar funis CRM', rule: 'crm-funnels.findAll' },
      { id: '58', name: 'Visualizar funil CRM', rule: 'crm-funnels.findOne' },
      { id: '59', name: 'Atualizar funil CRM', rule: 'crm-funnels.update' },
      { id: '60', name: 'Excluir funil CRM', rule: 'crm-funnels.delete' },
      { id: '61', name: 'Criar estágio CRM', rule: 'crm-stages.create' },
      { id: '62', name: 'Listar estágios CRM', rule: 'crm-stages.findAll' },
      { id: '63', name: 'Visualizar estágio CRM', rule: 'crm-stages.findOne' },
      { id: '64', name: 'Atualizar estágio CRM', rule: 'crm-stages.update' },
      { id: '65', name: 'Excluir estágio CRM', rule: 'crm-stages.delete' },

      // Internal Tasks Rules
      {
        id: '66',
        name: 'Visualizar tarefas internas',
        rule: 'internal-tasks.view',
      },
      {
        id: '67',
        name: 'Criar tarefas internas',
        rule: 'internal-tasks.create',
      },
      {
        id: '68',
        name: 'Editar tarefas internas',
        rule: 'internal-tasks.update',
      },
      {
        id: '69',
        name: 'Excluir tarefas internas',
        rule: 'internal-tasks.delete',
      },

      // Password Vault Rules
      {
        id: '70',
        name: 'Visualizar Banco de Senhas',
        rule: 'password-vault.view',
      },
      {
        id: '71',
        name: 'Criar Banco de Senhas',
        rule: 'password-vault.create',
      },
      {
        id: '72',
        name: 'Editar Banco de Senhas',
        rule: 'password-vault.update',
      },
      {
        id: '73',
        name: 'Excluir Banco de Senhas',
        rule: 'password-vault.delete',
      },

      // Checklist Rules
      {
        id: '74',
        name: 'Visualizar Checklists',
        rule: 'checklists.view',
      },
      {
        id: '75',
        name: 'Criar Checklists',
        rule: 'checklists.create',
      },
      {
        id: '76',
        name: 'Editar Checklists',
        rule: 'checklists.update',
      },
      {
        id: '77',
        name: 'Excluir Checklists',
        rule: 'checklists.delete',
      },

      // Customers Rules (Clientes)
      {
        id: '78',
        name: 'Visualizar Clientes',
        rule: 'customers.view',
      },
      {
        id: '79',
        name: 'Criar Cliente',
        rule: 'customers.create',
      },
      {
        id: '80',
        name: 'Editar Cliente',
        rule: 'customers.update',
      },
      {
        id: '81',
        name: 'Excluir Cliente',
        rule: 'customers.delete',
      },
    ];

    for (const ruleData of rulesData) {
      const existingRule = await ruleRepository.findOne({
        where: { rule: ruleData.rule },
      });

      if (!existingRule) {
        const rule = ruleRepository.create(ruleData);
        await ruleRepository.save(rule);
        console.log(`Rule '${ruleData.rule}' created.`);
      } else {
        // Atualiza o nome se for diferente (para manter traduções atualizadas)
        if (existingRule.name !== ruleData.name) {
          existingRule.name = ruleData.name;
          await ruleRepository.save(existingRule);
          console.log(`Rule '${ruleData.rule}' updated.`);
        } else {
          console.log(`Rule '${ruleData.rule}' already exists.`);
        }
      }
    }
  }
}
