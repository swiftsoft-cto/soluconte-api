# Instalar Versão do NodeJS 20.9.0

# Copiar .env.example para arquivo .env qual deverá criar e substituir pelos valores reais

# npm install

# npm run start:dev

# Rodar as Seeds
npx ts-node -r tsconfig-paths/register src/seed.ts

# Exemplo de comandos para gerar pastas:
nest g resource user
ou (gerar individualmente)
nest generate module user
nest generate service user
nest generate controller user

# Permissionamento 

- POR PERFIL:

  - Para ter uma permissão no método por perfil basta adicionar o decorator passando o perfil que poderá acessar o metodo:
     @Roles(TypeRoles.ADMIN)
     async method(){
     }

- POR TAGS







