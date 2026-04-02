// 1) Defina primeiro uma interface (ou type) para o que é registrado em `changes`:
export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  oldName?: string;
  newName?: string;
}

// 2) Monte um "dicionário" de templates, onde a chave é o nome do campo
//    e o valor é uma função que retorna a frase exata (você pode usar oldValue/newValue
//    para gerar textos ainda mais ricos se quiser).
const fieldActionMap: Record<string, (change: FieldChange) => string> = {
  // Exemplo: quando o front enviar `obs`, a action será "As observações foram atualizadas"
  obs: () => 'As observações foram atualizadas',

  // Quando marcar ou desmarcar como perdido:
  isLost: (change) => {
    return change.newValue
      ? 'A negociação foi perdida'
      : 'O status de perda da negociação foi removido';
  },

  isWon: (change) => {
    return change.newValue
      ? 'A negociação foi ganha'
      : 'O status de ganho da negociação foi removido';
  },

  // Exemplo para "mainInterest":
  mainInterest: () => 'O interesse principal foi atualizado',

  // Se o usuário trocar de etapa (stage):
  stageId: (change) => {
    if (change.oldName && change.newName) {
      return `A etapa da negociação foi alterada de "${change.oldName}" para "${change.newName}"`;
    }
    return 'A etapa da negociação foi alterada';
  },

  // Quando trocar de funil:
  funnelId: () => 'O funil da negociação foi alterado',

  // Troca de responsável:
  ownerId: () => 'O responsável pela negociação foi alterado',

  // Se trocar o array de tags:
  tags: () => {
    return `As tags foram atualizadas`;
  },

  // Se trocar empresa ou contato (aqui só exemplificando; a gente trata só o ID, mas
  // você pode criar algo mais rico, por ex. inserir o nome da empresa antiga e da nova)
  companyId: () => 'A empresa vinculada à negociação foi alterada',
  contactId: () => 'O contato vinculado à negociação foi alterado',

  // Se quiser mapear origin, order, etc:
  origin: () => 'A origem da negociação foi alterada',
  order: () => 'A posição da negociação no estágio foi alterada',
};

// 3) Crie uma função que receba todas as mudanças e retorne a "action" concatenada.
//    Essa função vai:
//      - Separar as mudanças que têm template específico (mapeadas em fieldActionMap).
//      - Se houver campos não mapeados, anotar que há "outras alterações".
//      - Se nenhuma mudança for mapeada, retorna um texto genérico.
export function buildActionFromChanges(changes: FieldChange[]): string {
  const frasesMapeadas: string[] = [];
  let countNaoMapeados = 0;

  for (const change of changes) {
    const key = change.field;
    const gerador = fieldActionMap[key];
    if (gerador) {
      // Se existe função no mapa, gera a frase correspondente
      frasesMapeadas.push(gerador(change));
    } else {
      // Campo não tem template, só contamos para depois mencionar "outras alterações"
      countNaoMapeados++;
    }
  }

  // Se não houver nenhuma frase mapeada, use um genérico:
  if (frasesMapeadas.length === 0) {
    return 'Negociação atualizada';
  }

  // Caso haja frases mapeadas, monte a concatenação "profissional":
  // Ex.: ["As observações foram atualizadas", "O interesse principal foi atualizado", …]
  let actionText: string;
  if (frasesMapeadas.length === 1) {
    // Só um item, usa direto
    actionText = frasesMapeadas[0];
  } else {
    // Se houver 2 ou mais, junta com vírgulas + " e " antes do último
    const todasMenosUltima = frasesMapeadas.slice(0, -1).join(', ');
    const ultima = frasesMapeadas[frasesMapeadas.length - 1];
    actionText = `${todasMenosUltima} e ${ultima}`;
  }

  // Se sobrou algum campo não mapeado, adicionamos uma menção genérica no final:
  if (countNaoMapeados > 0) {
    actionText += ' e outras atualizações foram feitas';
  }

  return actionText;
}
