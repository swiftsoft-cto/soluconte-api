-- Query para criar um cliente (usuário) associado a cada empresa na tabela companies
-- Apenas cria usuários para empresas que ainda não possuem um usuário associado
-- Como apenas nome da empresa e CNPJ são obrigatórios, os outros campos serão NULL ou valores padrão

-- Inserir usuários para empresas que ainda não têm um usuário associado
INSERT INTO users (
    id,
    name,
    last_name,
    email,
    password,
    is_root_user,
    is_email_confirmed,
    is_default,
    selected_company_id,
    created_at,
    updated_at
)
SELECT 
    UUID() as id,
    COALESCE(NULLIF(TRIM(c.business_name), ''), NULLIF(TRIM(c.name), ''), 'Cliente') as name,
    '' as last_name,
    CONCAT('temp_', REPLACE(UUID(), '-', ''), '@temp.com') as email,
    NULL as password,
    1 as is_root_user,
    0 as is_email_confirmed,
    0 as is_default,
    c.id as selected_company_id,
    NOW() as created_at,
    NOW() as updated_at
FROM companies c
WHERE c.deleted_at IS NULL
  AND c.cnpj IS NOT NULL
  AND c.cnpj != ''
  AND NOT EXISTS (
    -- Verifica se já existe um usuário associado a esta empresa
    SELECT 1 
    FROM users u 
    WHERE u.selected_company_id = c.id 
      AND u.deleted_at IS NULL
  );

-- Associar cada usuário criado ao role CEO (id = '1')
-- Esta query associa todos os usuários que têm selected_company_id mas não têm nenhum role ainda
INSERT INTO user_role (
    id,
    user_id,
    role_id,
    created_at,
    updated_at
)
SELECT 
    UUID() as id,
    u.id as user_id,
    '1' as role_id,  -- Role CEO (administrador)
    NOW() as created_at,
    NOW() as updated_at
FROM users u
INNER JOIN companies c ON u.selected_company_id = c.id
WHERE u.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
    -- Verifica se já existe uma associação deste usuário com algum role
    SELECT 1
    FROM user_role ur 
    WHERE ur.user_id = u.id 
      AND ur.deleted_at IS NULL
  );

