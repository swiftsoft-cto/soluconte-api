# Uso do fork whatsapp-web.js (fix evento ready)

## Por que este fork?

O repositório oficial (`pedroslopez/whatsapp-web.js`) pode falhar em algumas contas ao usar **LocalAuth**: o evento `authenticated` dispara após escanear o QR, mas o evento **`ready`** nunca é emitido. Isso ocorre quando o módulo `WAWebSetPushnameConnAction` não está disponível durante a injeção do Store no WhatsApp Web, gerando erro como:

- `Requiring unknown module "WAWebSetPushnameConnAction"`
- `Cannot read properties of undefined (reading 'getChat')` em `sendMessage`

**PR de referência:** [Correção: evento de pronto não disparado em algumas contas #5738](https://github.com/pedroslopez/whatsapp-web.js/pull/5738) (autor: yosofbayan).

Este projeto usa o **fork com a correção** até que o fix seja incorporado ao repositório oficial.

---

## Como está configurado

No `package.json` a dependência está apontando para o fork e o branch com o fix:

```json
"whatsapp-web.js": "github:yosofbayan/whatsapp-web.js#8f0de87"
```

- **Repositório:** https://github.com/yosofbayan/whatsapp-web.js  
- **Commit do fix (PR #5738):** `8f0de87` — evita problema de encoding do nome do branch no Windows

---

## Instalação / atualização

1. **Instalar dependências (incluindo o fork):**
   ```bash
   cd api
   npm install
   ```

2. **Se já tinha o pacote oficial instalado, forçar uso do fork:**
   ```bash
   cd api
   rm -rf node_modules/whatsapp-web.js
   npm install
   ```
   No Windows (PowerShell):
   ```powershell
   cd api
   Remove-Item -Recurse -Force node_modules\whatsapp-web.js
   npm install
   ```

3. **Voltar para a versão oficial (quando o fix for merged):**  
   Altere no `package.json` para:
   ```json
   "whatsapp-web.js": "^1.34.4"
   ```
   e rode `npm install`.

---

## Observações

- **Atualizações:** Enquanto usar o fork, você não recebe atualizações automáticas do npm; o código vem do branch do GitHub.
- **patch-package:** Se você tinha um patch em `patches/whatsapp-web.js+*.patch`, ele não se aplica ao fork (o fork já contém a correção). Pode remover o patch ou o diretório `patches` se ficar vazio.
- **Conflitos:** Se no futuro o fork divergir muito do oficial, avalie migrar de volta ao oficial quando o [PR #5738](https://github.com/pedroslopez/whatsapp-web.js/pull/5738) for merged.
