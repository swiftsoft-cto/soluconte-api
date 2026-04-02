import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from 'src/modules/roles/entities/roles.entities';
import { RoleRule } from 'src/modules/role-rule/entities/role-rule.entity';

@Injectable()
export default class CreateDepartmentRolesSeeder {
  constructor(private readonly dataSource: DataSource) {}

  public async run() {
    const roleRepository = this.dataSource.getRepository(Role);
    const roleRuleRepository = this.dataSource.getRepository(RoleRule);

    // Criar cargos para departamentos
    const departmentRoles = [
      {
        id: '2',
        name: 'Gerente de Marketing',
        description: 'Gerente do departamento de Marketing',
      },
      {
        id: '3',
        name: 'Gerente de Vendas',
        description: 'Gerente do departamento de Vendas',
      },
      {
        id: '4',
        name: 'Gerente de TI',
        description: 'Gerente do departamento de TI',
      },
      {
        id: '5',
        name: 'Colaborador',
        description: 'Colaborador comum do departamento',
      },
    ];

    for (const roleData of departmentRoles) {
      const existingRole = await roleRepository.findOne({
        where: { id: roleData.id },
      });

      if (!existingRole) {
        const role = roleRepository.create(roleData);
        await roleRepository.save(role);
        console.log(`Role '${roleData.name}' created.`);
      } else {
        console.log(`Role '${roleData.name}' already exists.`);
      }
    }

    // Atribuir permissões aos cargos de departamento
    const departmentRoleRules = [
      // Gerentes de departamento podem ver, criar, editar tarefas do seu departamento
      { roleId: '2', ruleId: '66' }, // internal-tasks.view
      { roleId: '2', ruleId: '67' }, // internal-tasks.create
      { roleId: '2', ruleId: '68' }, // internal-tasks.update

      { roleId: '3', ruleId: '66' }, // internal-tasks.view
      { roleId: '3', ruleId: '67' }, // internal-tasks.create
      { roleId: '3', ruleId: '68' }, // internal-tasks.update

      { roleId: '4', ruleId: '66' }, // internal-tasks.view
      { roleId: '4', ruleId: '67' }, // internal-tasks.create
      { roleId: '4', ruleId: '68' }, // internal-tasks.update

      // Colaboradores podem ver e criar tarefas
      { roleId: '5', ruleId: '66' }, // internal-tasks.view
      { roleId: '5', ruleId: '67' }, // internal-tasks.create

      // Permissões do Password Vault - apenas visualização para cargos de departamento
      { roleId: '2', ruleId: '70' }, // password-vault.view
      { roleId: '3', ruleId: '70' }, // password-vault.view
      { roleId: '4', ruleId: '70' }, // password-vault.view
      { roleId: '5', ruleId: '70' }, // password-vault.view
    ];

    for (const association of departmentRoleRules) {
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

    console.log('✅ Cargos de departamento e permissões criados com sucesso!');
  }
}
