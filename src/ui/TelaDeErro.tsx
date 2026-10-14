import type { Calculo } from "../compartilhado/tipos.ts";
import type { Ambiente } from "./ambiente.ts";
import { nomeDoArquivo } from "./arquivo.ts";

/**
 * O que aparece no lugar do Apura quando um defeito do programa impede a tela de ser montada
 * (§18.6): a frase, "Salvar o cálculo" (o último cálculo exibido, sem o resultado; o arquivo abre
 * depois com o aviso de arquivo sem resultado) e "Recarregar a página". Sem cálculo exibido (o
 * defeito veio antes), só "Recarregar a página".
 */
export function TelaDeErro({
  ambiente,
  calculo,
}: {
  ambiente: Ambiente;
  calculo: () => Calculo | null;
}) {
  const salvar = () => {
    const atual = calculo();
    if (atual === null) return;
    ambiente.baixar(
      nomeDoArquivo(atual),
      JSON.stringify({ formato: "apura/calculo@1", calculo: atual }, null, 2),
    );
  };
  return (
    <main className="tela-de-erro" role="alert">
      <h1>Algo deu errado no Apura.</h1>
      <p>O cálculo em andamento pode ser salvo num arquivo antes de recomeçar.</p>
      <div className="dialogo-acoes">
        {calculo() === null ? null : (
          <button type="button" className="botao" onClick={salvar}>
            Salvar o cálculo
          </button>
        )}
        <button type="button" className="botao secundario" onClick={() => ambiente.recarregar()}>
          Recarregar a página
        </button>
      </div>
    </main>
  );
}
