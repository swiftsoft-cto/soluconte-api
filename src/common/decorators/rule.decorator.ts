import { SetMetadata } from '@nestjs/common';

export const RULE_KEY = 'rules';

/**
 * Decorator para definir as regras necessárias na rota
 * @param rules Regras exigidas (pode ser string única, array de string, ou múltiplos strings)
 */
export function Rule(...rulesOrArray: (string | string[])[]): MethodDecorator {
  // "rulesOrArray" pode conter strings ou arrays de string
  // Precisamos "achatar" todos em um só array de strings

  const flattenedRules: string[] = rulesOrArray.flat();
  // `Array.prototype.flat()` remove um nível de array se existir.
  // Assim, ["abc"] => ["abc"], mas ["abc", ["def", "ghi"]] => ["abc", "def", "ghi"].

  // Agora, definimos no metadata do Nest "RULE_KEY" com o array "flattenedRules".
  return SetMetadata(RULE_KEY, flattenedRules);
}
