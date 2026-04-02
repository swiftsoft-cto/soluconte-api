import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/departments.entiy';
import { Company } from '../companies/entities/companies.entity';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async findOrCreate(name: string, company: Company): Promise<Department> {
    let department = await this.departmentRepository.findOne({
      where: { name, company },
    });
    if (!department) {
      department = this.departmentRepository.create({ name, company });
      await this.departmentRepository.save(department);
    }
    return department;
  }

  async findOneById(id: string): Promise<any> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: [
        'company', // Relacionamento com a empresa
        'roleDepartments', // Relacionamento com RoleDepartment
        'roleDepartments.role', // Relacionamento com Role
        'roleDepartments.role.userRoles', // Relacionamento com UserRole
        'roleDepartments.role.userRoles.user', // Relacionamento com User
      ],
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Extrai os usuários vinculados ao departamento
    const users = department.roleDepartments
      .flatMap((roleDepartment) => roleDepartment.role?.userRoles || [])
      .map((userRole) => userRole.user);

    // Retorna o departamento e os usuários vinculados
    return { ...department, users };
  }

  /**
   * Cria um novo departamento em determinada empresa.
   */
  async createDepartment(
    dto: CreateDepartmentDto,
    company: Company,
  ): Promise<any> {
    // Cria o departamento
    const department = this.departmentRepository.create({
      name: dto.name,
      description: dto.description,
      company,
    });
    const savedDepartment = await this.departmentRepository.save(department);

    return { ...savedDepartment };
  }

  /**
   * Retorna todos os departamentos de uma empresa (pelo ID),
   */
  async findAllByCompany(companyId: string): Promise<any> {
    const departments = await this.departmentRepository
      .createQueryBuilder('department')
      .where('department.company_id = :companyId', { companyId })
      .andWhere('department.deleted_at IS NULL')
      .orderBy('department.name', 'ASC')
      .getMany();
    
    console.log('[DepartmentsService.findAllByCompany]', {
      companyId,
      totalDepartments: departments.length
    });
    
    const results = await Promise.all(
      departments.map(async (dept) => {
        return { ...dept };
      }),
    );
    return results;
  }

  /**
   * Retorna departamentos paginados de uma empresa
   */
  async paginate(
    limit: number,
    page: number,
    companyId: string,
    filter?: string,
  ): Promise<{
    message: string;
    statusCode: number;
    data: {
      items: Department[];
      totalItems: number;
      totalPages: number;
      currentPage: number;
    };
  }> {
    const query = this.departmentRepository
      .createQueryBuilder('department')
      .leftJoinAndSelect('department.company', 'company')
      .where('company.id = :companyId', { companyId })
      .andWhere('department.deleted_at IS NULL');

    // Aplica filtro por nome
    if (filter) {
      query.andWhere(
        '(department.name LIKE :filter OR department.description LIKE :filter)',
        { filter: `%${filter}%` },
      );
    }

    // Aplica paginação
    query.take(limit);
    query.skip((page - 1) * limit);

    const [items, totalItems] = await query.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: 'Departamentos retornados com sucesso.',
      statusCode: 200,
      data: {
        items,
        totalItems,
        totalPages,
        currentPage: page,
      },
    };
  }

  /**
   * Atualiza um departamento, se pertencer à empresa informada.
   */
  async updateDepartment(
    id: string,
    companyId: string,
    updateDto: UpdateDepartmentDto,
  ): Promise<any> {
    const department = await this.findOneById(id);
    if (!department || department.company.id !== companyId) {
      throw new NotFoundException(
        'Department not found or does not belong to your selected company',
      );
    }

    Object.assign(department, updateDto);
    const savedDepartment = await this.departmentRepository.save(department);

    return { ...savedDepartment };
  }

  async removeDepartment(
    departmentId: string,
    companyId: string,
    user: any,
  ): Promise<{ message: string }> {
    const department = await this.findOneById(departmentId);

    if (!department || department.company.id !== companyId) {
      throw new NotFoundException(
        'Department not found or does not belong to your selected company',
      );
    }

    // Verifica se o usuário pertence ao departamento
    const userBelongsToDepartment = department.users?.some(
      (departmentUser) => departmentUser.id === user.id,
    );

    if (userBelongsToDepartment) {
      throw new BadRequestException(
        'Você pertence a esse departamento, não é possível excluir.',
      );
    }
    await this.departmentRepository.softRemove(department);
    return { message: 'Departamento excluído com sucesso.' };
  }
}
