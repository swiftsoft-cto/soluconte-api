import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RoleRule } from 'src/modules/role-rule/entities/role-rule.entity';

@Injectable()
export default class RoleRulesSeeder {
  constructor(private readonly dataSource: DataSource) {}

  public async run() {
    const roleRuleRepository = this.dataSource.getRepository(RoleRule);

    const associations = [
      { roleId: '1', ruleId: '1' },
      { roleId: '1', ruleId: 'team' },
      // Permissões para Dados da Empresa - atribuídas ao CEO (administrador)
      { roleId: '1', ruleId: '21' }, // company.findOne - Visualizar detalhes da empresa
      { roleId: '1', ruleId: '40' }, // company.findAll - Visualizar todas as empresas (clientes)
      // Permissões para Funções (Cargos) - atribuídas ao CEO (administrador)
      { roleId: '1', ruleId: '11' }, // roles.findAll - Visualizar todos os cargos
      { roleId: '1', ruleId: '12' }, // roles.paginate - Visualizar cargos paginados (para selects)
      // Permissões para Departamentos - atribuídas ao CEO (administrador)
      { roleId: '1', ruleId: '251' }, // departments.paginate - Visualizar departamentos paginados
      { roleId: '1', ruleId: '253' }, // departments.select - Selecionar departamentos em formulários (não bloqueia menu)
      // Permissões para Usuários - atribuídas ao CEO (administrador)
      { roleId: '1', ruleId: '254' }, // users.select - Selecionar usuários em formulários (não bloqueia menu)
      // Regras para tarefas internas - atribuídas ao CEO (administrador)
      { roleId: '1', ruleId: '66' }, // internal-tasks.view
      { roleId: '1', ruleId: '67' }, // internal-tasks.create
      { roleId: '1', ruleId: '68' }, // internal-tasks.update
      { roleId: '1', ruleId: '69' }, // internal-tasks.delete
      // Regras para Clientes - atribuídas ao CEO (administrador)
      { roleId: '1', ruleId: '78' }, // customers.view - Visualizar Clientes
      { roleId: '1', ruleId: '79' }, // customers.create - Criar Cliente
      { roleId: '1', ruleId: '80' }, // customers.update - Editar Cliente
      { roleId: '1', ruleId: '81' }, // customers.delete - Excluir Cliente
    ];

    for (const association of associations) {
      const existingRoleRule = await roleRuleRepository.findOne({
        where: {
          role: { id: association.roleId },
          rule: { id: association.ruleId },
        },
      });

      if (!existingRoleRule) {
        const roleRule = roleRuleRepository.create({
          role: { id: association.roleId },
          rule: { id: association.ruleId },
        });
        await roleRuleRepository.save(roleRule);
        console.log(
          `Rule '${association.ruleId}' associated with Role '${association.roleId}'.`,
        );
      } else {
        console.log(
          `Rule '${association.ruleId}' is already associated with Role '${association.roleId}'.`,
        );
      }
    }
  }
}
