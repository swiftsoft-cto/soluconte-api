-- Script para atualizar a descrição da permissão do administrador para português
-- Execute este script no banco de dados para atualizar a descrição existente

-- Opção 1: Usando o ID da regra (mais seguro para o MySQL Workbench)
UPDATE rules 
SET name = 'Tem permissão para acessar qualquer recurso'
WHERE id = '1' AND rule = 'administrator';

-- Opção 2: Se preferir usar apenas o rule (pode dar erro no modo seguro)
-- UPDATE rules 
-- SET name = 'Tem permissão para acessar qualquer recurso'
-- WHERE rule = 'administrator' AND name = 'Has permission to access any resource';

