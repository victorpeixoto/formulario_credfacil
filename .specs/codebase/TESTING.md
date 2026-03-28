# Testing Infrastructure

## Test Frameworks

**Unit/Integration:** Nenhum configurado
**E2E:** Nenhum configurado
**Coverage:** Nenhum

## Test Organization

**Location:** Nenhum diretório de testes presente
**Naming:** N/A
**Structure:** N/A

## Testing Patterns

### Unit Tests

**Approach:** Não implementado
**Observação:** A lógica de `lib/avaliar.ts` (`candidatoAprovado`) e `lib/validators.ts` são candidatas naturais para unit tests por serem funções puras sem dependências externas.

### Integration Tests

**Approach:** Não implementado
**Observação:** `app/api/submit/route.ts` e `app/api/check-cpf/route.ts` são candidatas para testes de integração com MongoDB em memória.

### E2E Tests

**Approach:** Não implementado

## Test Execution

**Commands:** Nenhum script de test no `package.json`
**Configuration:** N/A

## Coverage Targets

**Current:** 0% (sem testes)
**Goals:** Não documentados
**Enforcement:** Nenhum

## Observações para Futuro

- `candidatoAprovado()` em `lib/avaliar.ts` é pura — fácil de testar com Jest/Vitest
- `validators.ts` também é candidato a unit tests
- Para API routes, usar `next-test-api-route-handler` ou testes de integração com supertest
- Para E2E do fluxo de formulário, Playwright seria adequado (mobile-first)
