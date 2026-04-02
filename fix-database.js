const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    console.log('🔧 Iniciando correção do banco de dados...');

    // 1. Verificar se a coluna já existe
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'internal_tasks' AND COLUMN_NAME = 'created_by_id'
    `, [process.env.DB_DATABASE]);

    if (columns.length === 0) {
      console.log('📝 Adicionando coluna created_by_id...');
      await connection.execute(`
        ALTER TABLE internal_tasks ADD COLUMN created_by_id VARCHAR(36) NULL
      `);
      console.log('✅ Coluna created_by_id adicionada com sucesso!');
    } else {
      console.log('ℹ️ Coluna created_by_id já existe');
    }

    // 2. Verificar se há registros sem created_by_id
    const [tasksWithoutCreatedBy] = await connection.execute(`
      SELECT COUNT(*) as count FROM internal_tasks WHERE created_by_id IS NULL
    `);

    if (tasksWithoutCreatedBy[0].count > 0) {
      console.log(`🔄 Atualizando ${tasksWithoutCreatedBy[0].count} registros...`);
      
      // Atualizar com usuário padrão (ID 1)
      await connection.execute(`
        UPDATE internal_tasks SET created_by_id = '1' WHERE created_by_id IS NULL
      `);
      console.log('✅ Registros atualizados com sucesso!');
    } else {
      console.log('ℹ️ Todos os registros já têm created_by_id');
    }

    // 3. Verificar se a foreign key já existe
    const [constraints] = await connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'internal_tasks' AND COLUMN_NAME = 'created_by_id'
    `, [process.env.DB_DATABASE]);

    if (constraints.length === 0) {
      console.log('🔗 Adicionando foreign key...');
      await connection.execute(`
        ALTER TABLE internal_tasks ADD CONSTRAINT fk_internal_tasks_created_by 
        FOREIGN KEY (created_by_id) REFERENCES users(id)
      `);
      console.log('✅ Foreign key adicionada com sucesso!');
    } else {
      console.log('ℹ️ Foreign key já existe');
    }

    // 4. Verificar resultado final
    const [finalCheck] = await connection.execute(`
      SELECT COUNT(*) as total_tasks, 
             COUNT(created_by_id) as tasks_with_created_by
      FROM internal_tasks
    `);

    console.log('📊 Verificação final:');
    console.log(`   Total de tarefas: ${finalCheck[0].total_tasks}`);
    console.log(`   Tarefas com created_by_id: ${finalCheck[0].tasks_with_created_by}`);

    if (finalCheck[0].total_tasks === finalCheck[0].tasks_with_created_by) {
      console.log('🎉 Banco de dados corrigido com sucesso!');
      console.log('🚀 Agora você pode iniciar a aplicação normalmente');
    } else {
      console.log('⚠️ Ainda há problemas no banco de dados');
    }

  } catch (error) {
    console.error('❌ Erro ao corrigir banco de dados:', error.message);
    
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('💡 Dica: A foreign key já existe, isso é normal');
    } else if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('💡 Dica: A coluna já existe, isso é normal');
    }
  } finally {
    await connection.end();
  }
}

fixDatabase(); 