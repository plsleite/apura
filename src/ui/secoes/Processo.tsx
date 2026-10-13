import type { Cabecalho } from "../../compartilhado/tipos.ts";
import { Ajuda } from "../componentes/Ajuda.tsx";
import { CampoTexto, Opcao, useCampoValidado } from "../componentes/Campo.tsx";
import { formatarNumeroProcesso, lerNumeroProcesso } from "../entrada.ts";
import type { Preferencias } from "../preferencias.ts";

/**
 * Seção "1 · Processo" (§9.2): defensor(a) e órgão lembrados no navegador, nº do processo no
 * padrão do CNJ (máscara e dígitos verificadores) e as partes; opção de guardar cálculos recentes
 * neste navegador. Campos em duas colunas, ocupando a largura da seção (empilham no celular);
 * explicações nos balões ⓘ (decisões de 13/10/2026). Partes e processo não são gravados em
 * servidor algum (§14).
 */
export function Processo({
  cabecalho,
  aoMudar,
  preferencias,
  aoMudarPreferencias,
  aoEsquecer,
  armazenamentoDisponivel,
}: {
  cabecalho: Cabecalho;
  aoMudar: (campo: keyof Cabecalho, valor: string) => void;
  preferencias: Preferencias;
  aoMudarPreferencias: (mudancas: Partial<Preferencias>) => void;
  aoEsquecer: () => void;
  armazenamentoDisponivel: boolean;
}) {
  const processo = useCampoValidado({
    valorGuardado: cabecalho.processo,
    paraTexto: (texto) => texto,
    ler: lerNumeroProcesso,
    aoValidar: (valor) => aoMudar("processo", valor),
  });
  return (
    <section className="secao" aria-labelledby="titulo-processo">
      <div className="titulo-secao">
        <h2 id="titulo-processo">1 · Processo</h2>
        <Ajuda assunto="Processo">
          Partes e processo não são gravados em servidor algum: vão só para o relatório e para o
          arquivo que você salvar. Defensor(a) e órgão ficam guardados só neste navegador, para o
          próximo cálculo; "Esquecer" apaga o que está guardado (nomes e cálculos recentes) e
          desliga o "Lembrar".
        </Ajuda>
      </div>
      <div className="grade-2">
        <CampoTexto
          id="defensor"
          rotulo="Defensor(a) responsável"
          valor={cabecalho.defensor}
          aoMudar={(v) => aoMudar("defensor", v)}
          autoComplete="off"
        />
        <CampoTexto
          id="orgao"
          rotulo="Órgão de atuação"
          valor={cabecalho.orgao}
          aoMudar={(v) => aoMudar("orgao", v)}
          autoComplete="off"
        />
      </div>
      <div className="linha">
        <Opcao
          rotulo="Lembrar neste navegador"
          marcado={preferencias.lembrar}
          aoMudar={(marcado) => aoMudarPreferencias({ lembrar: marcado })}
        />
        <button type="button" className="botao discreto" onClick={aoEsquecer}>
          Esquecer
        </button>
      </div>
      {armazenamentoDisponivel ? null : (
        <p className="nota">
          Este navegador não permite guardar nada: "Lembrar neste navegador" e "Guardar cálculos
          recentes" não têm efeito aqui, e o tema escolhido vale só até recarregar ou fechar a
          página.
        </p>
      )}
      <CampoTexto
        id="processo"
        rotulo="Nº do processo"
        valor={processo.texto}
        aoMudar={processo.aoMudar}
        mascara={formatarNumeroProcesso}
        aoSair={processo.aoSair}
        erro={processo.erro}
        classe="processo"
        inputMode="numeric"
        placeholder="0000000-00.0000.0.00.0000"
        autoComplete="off"
        ajuda="Padrão do CNJ: digite só os números, e o hífen e os pontos entram sozinhos. Pode ficar em branco se o processo ainda não existe."
      />
      <div className="grade-2">
        <CampoTexto
          id="exequente"
          rotulo="Exequente (alimentando)"
          valor={cabecalho.exequente}
          aoMudar={(v) => aoMudar("exequente", v)}
          autoComplete="off"
        />
        <CampoTexto
          id="executado"
          rotulo="Executado (alimentante)"
          valor={cabecalho.executado}
          aoMudar={(v) => aoMudar("executado", v)}
          autoComplete="off"
        />
      </div>
      <div className="linha">
        <Opcao
          rotulo="Guardar cálculos recentes neste navegador"
          marcado={preferencias.guardarRecentes}
          aoMudar={(marcado) => aoMudarPreferencias({ guardarRecentes: marcado })}
        />
        <Ajuda assunto="cálculos recentes">
          Os cinco últimos cálculos ficam em "Abrir", só neste navegador. Em computador
          compartilhado, desligue: os recentes já guardados são apagados, e "Novo cálculo" e "Abrir"
          passam a descartar o cálculo atual sem aviso (salve antes).
        </Ajuda>
      </div>
    </section>
  );
}
