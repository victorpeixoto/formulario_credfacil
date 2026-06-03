# Critérios atuais de validação de documentos por IA

Atualizado em: 01/06/2026

Este documento resume, em linguagem simples, como a validação automática dos documentos funciona hoje.

## Documentos analisados

O candidato envia 5 itens:

1. CNH
2. Comprovante de residência
3. Selfie ao lado do veículo
4. Vídeo do aplicativo
5. Vídeo do veículo

Após o envio, a IA analisa cada arquivo e cruza as informações entre os documentos e os dados informados no cadastro.

## CNH

A CNH é aprovada quando:

- A imagem está legível e sem cortes relevantes.
- A data de validade é identificada.
- A CNH está dentro da validade.
- O CPF da CNH confere com o CPF informado no cadastro.
- O nome da CNH confere com o nome informado no cadastro.

A CNH é rejeitada quando:

- Está ilegível ou cortada.
- A validade não é identificada.
- Está vencida.
- O CPF não confere com o cadastro.
- O nome não confere com o cadastro.

## Comprovante de residência

O comprovante é aprovado quando:

- Está legível e sem cortes relevantes.
- A data de emissão ou referência é identificada.
- Foi emitido nos últimos 90 dias.
- O endereço confere com o endereço informado no cadastro.

O endereço é validado por comparação dos principais campos:

- Rua ou avenida
- Número
- Bairro
- Cidade
- Estado
- CEP

O comprovante é rejeitado quando:

- Está ilegível ou cortado.
- A data de emissão não é identificada.
- Tem mais de 90 dias.
- O endereço não confere com o cadastro.

Caso o endereço esteja correto, mas o comprovante esteja em nome de outra pessoa, o processo vai para análise manual.

## Selfie ao lado do veículo

A selfie é aprovada quando:

- A pessoa aparece claramente na foto.
- O veículo aparece claramente na foto.
- A imagem não apresenta sinais visíveis de edição.

A selfie é rejeitada quando:

- A pessoa não aparece claramente.
- O veículo não aparece claramente.
- A imagem aparenta ter sido editada.

A placa identificada na selfie também é usada no cruzamento com os vídeos.

## Vídeo do aplicativo

O vídeo do aplicativo é aprovado quando:

- Não apresenta sinais claros de corte, montagem ou adulteração.
- Mostra os ganhos em formato mensal, mês a mês.
- Mostra os ganhos dos últimos 6 meses completos.
- O nome do perfil no app confere com o nome do cadastro.
- A placa exibida no app é compatível com a placa dos demais documentos.
- O faturamento atende a pelo menos um dos critérios abaixo:
  - Todos os últimos 6 meses têm faturamento igual ou acima de R$ 3.500; ou
  - Os últimos 3 meses têm faturamento igual ou acima de R$ 3.500.

O vídeo do aplicativo é rejeitado quando:

- Apresenta sinais claros de corte, montagem ou adulteração.
- Mostra ganhos apenas em formato diário, semanal ou total, sem mês a mês.
- Não mostra os últimos 6 meses completos.
- Nem os últimos 6 meses nem os últimos 3 meses atingem o mínimo de R$ 3.500.
- O nome do perfil não confere com o cadastro.
- A placa diverge das demais fontes analisadas.

Observação: navegação normal no app, troca de telas, rolagem, abertura de menus ou mudança entre aplicativos não são consideradas corte por si só.

## Vídeo do veículo

O vídeo do veículo é aprovado quando:

- O veículo aparenta estar ligado.
- O vídeo não apresenta cortes ou edição visível.
- A placa identificada é compatível com os demais documentos.

O vídeo do veículo é rejeitado quando:

- O veículo não aparenta estar ligado.
- O vídeo apresenta cortes ou edição visível.
- A placa diverge das demais fontes analisadas.

## Cruzamento de placa

A placa é comparada entre:

- Selfie ao lado do veículo
- Vídeo do aplicativo
- Vídeo do veículo

Quando pelo menos 2 das 3 fontes apresentam a mesma placa, o cruzamento é considerado compatível.

Se a placa divergir entre as fontes, a selfie, o vídeo do aplicativo e o vídeo do veículo são rejeitados.

## Biometria facial

A biometria compara o rosto da CNH com o rosto da selfie.

Critérios atuais:

- Similaridade alta: aprovado.
- Similaridade intermediária: requer revisão humana.
- Similaridade baixa: rejeitado.
- Rosto não detectado na CNH ou na selfie: rejeitado.

## Resultado final do processo

O processo pode terminar em 3 situações:

### Aprovado

Todos os documentos principais foram aprovados e não houve divergência de identidade.

### Pendência

Um ou mais documentos foram rejeitados, ou alguma informação importante não conferiu. Nesse caso, o candidato deve reenviar o documento pendente.

### Análise manual

O processo vai para análise manual quando:

- O comprovante está em nome de outra pessoa, mas o endereço confere.
- Um documento acumula 3 ou mais rejeições.
- A validação automática identifica situação que exige revisão humana.
