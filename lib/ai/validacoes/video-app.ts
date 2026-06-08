import { analisarVideo } from '../gemini';
import { FATURAMENTO_MENSAL_MINIMO, MESES_FATURAMENTO } from '../pipeline/config';
import type { ResultadoVideoApp } from '@/types/documentos';

const PROMPT = `Você recebe um vídeo enviado por um candidato. Ele DEVE ser uma gravação de tela (ou outro celular filmando a tela) de um aplicativo de transporte/entrega — iFood, Uber, 99, Rappi, etc. — mostrando o perfil e os ganhos mensais.

PRIMEIRO, decida se o vídeo é REALMENTE isso:
- Se o vídeo mostra a interface de um app de transporte/entrega com dados de perfil/ganhos → "appTransporte": true.
- Se o vídeo for QUALQUER outra coisa (um carro, uma pessoa, uma rua, uma tela de outro tipo, vídeo aleatório, sem interface de app de transporte) → "appTransporte": false e retorne TODOS os demais campos como null (ou false/[] conforme o tipo). NÃO invente nome, placa, faturamento, ganhos ou qualquer dado que não esteja claramente visível na tela do app. É PROIBIDO adivinhar.

Se "appTransporte" for true, extraia (apenas o que estiver visível; caso contrário null):
1. Nome do perfil visível no app
2. Placa do veículo (se visível no app)
3. Faturamento dos últimos 180 dias (se visível)
4. Tempo de uso/cadastro no app (se visível)
5. Total de corridas/entregas (se visível)
6. Qual aplicativo está sendo mostrado?
7. O vídeo apresenta sinais de adulteração ou edição maliciosa?
8. O vídeo mostra os ganhos em formato MENSAL (mês a mês)? Ou apenas diário/semanal/total?
9. Extraia os ganhos mês a mês dos últimos 6 meses: [{"mes": "YYYY-MM", "valor": 3800}, ...].
   Se ganhos estiverem em formato diário, semanal ou apenas total: retorne formatoGanhos = "invalido".
   Se não identificado: retorne formatoGanhos = "nao_identificado".
10. A foto do perfil do candidato aparece visível no vídeo?

IMPORTANTE sobre cortes/transições:
- Este é um vídeo de GRAVAÇÃO DE TELA ou outro celular gravando uma tela. O usuário navega entre telas, abas e aplicativos diferentes durante a gravação.
- Transições naturais de navegação (trocar de tela, abrir menu, scroll, mudar de app, voltar para home) NÃO são cortes nem edição.
- Considere "temCortes" como true APENAS se houver sinais claros de adulteração: saltos bruscos no tempo, frames inseridos de outra gravação, sobreposição de imagens editadas, ou alteração visível de dados/valores na tela.

Responda APENAS em JSON:
{
  "appTransporte": true,
  "nomePerfil": "...",
  "placa": "...",
  "faturamento180d": "...",
  "tempoUso": "...",
  "totalCorridas": "...",
  "temCortes": false,
  "motivoCortes": null,
  "aplicativo": "...",
  "ganhosMensais": [{"mes": "YYYY-MM", "valor": 3800}],
  "formatoGanhos": "mensal",
  "fotoPerfilVisivel": true
}`;

export function validarRegraVideoApp(dados: ResultadoVideoApp): {
  aprovado: boolean;
  motivo: string | null;
} {
  if (dados.appTransporte === false) {
    return {
      aprovado: false,
      motivo:
        'O vídeo não é uma gravação de tela de um aplicativo de transporte/entrega com os ganhos. Reenvie a gravação da tela do app (iFood, Uber, 99, etc.).',
    };
  }

  if (dados.temCortes) {
    return { aprovado: false, motivo: 'Vídeo apresenta cortes ou edição' };
  }

  if (dados.formatoGanhos === 'invalido') {
    return {
      aprovado: false,
      motivo: 'Ganhos não estão no formato mensal. Mostre mês a mês — não envie ganhos diários ou semanais.',
    };
  }

  if (dados.ganhosMensais && Array.isArray(dados.ganhosMensais)) {
    if (dados.ganhosMensais.length < MESES_FATURAMENTO) {
      return {
        aprovado: false,
        motivo: `Vídeo não mostra os ganhos dos últimos ${MESES_FATURAMENTO} meses completos.`,
      };
    }
    // Ordena do mês mais antigo para o mais recente ("YYYY-MM")
    const meses = [...dados.ganhosMensais].sort((a, b) => a.mes.localeCompare(b.mes));

    const seisMesesOk = meses.every((g) => g.valor >= FATURAMENTO_MENSAL_MINIMO);
    const tresMesesOk = meses.slice(-3).every((g) => g.valor >= FATURAMENTO_MENSAL_MINIMO);

    // Aprova se os 6 meses estão >= mínimo; senão, tenta aprovar pelos últimos 3 meses.
    if (!seisMesesOk && !tresMesesOk) {
      return {
        aprovado: false,
        motivo: `Faturamento abaixo de R$ ${FATURAMENTO_MENSAL_MINIMO}: nem os últimos ${MESES_FATURAMENTO} meses, nem os últimos 3 meses atingiram o mínimo.`,
      };
    }
  }

  return { aprovado: true, motivo: null };
}

export async function validarVideoApp(videoUrl: string): Promise<{
  aprovado: boolean;
  motivo: string | null;
  dadosExtraidos: ResultadoVideoApp;
}> {
  const dados = (await analisarVideo(videoUrl, PROMPT)) as unknown as ResultadoVideoApp;
  const { aprovado, motivo } = validarRegraVideoApp(dados);
  return { aprovado, motivo, dadosExtraidos: dados };
}
