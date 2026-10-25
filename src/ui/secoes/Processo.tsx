import type { Cabecalho } from "../../compartilhado/tipos.ts";
import { CampoTexto, useCampoValidado } from "../componentes/Campo.tsx";
import { formatarNumeroProcesso, lerNumeroProcesso } from "../entrada.ts";

/**
 * Seção "1 · Processo" (§9.2): defensor(a) e órgão sempre lembrados no navegador (§21.4), nº do
 * processo no padrão do CNJ (máscara e dígitos verificadores) e as partes. Campos em duas colunas,
 * ocupando a largura da seção (empilham no celular); a seção não tem balão ⓘ (§21.9). Partes e
 * processo não são gravados em servidor algum (§14).
 */
export function Processo({
  cabecalho,
  aoMudar,
  armazenamentoDisponivel,
}: {
  cabecalho: Cabecalho;
  aoMudar: (campo: keyof Cabecalho, valor: string) => void;
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
      {armazenamentoDisponivel ? null : (
        <p className="nota">
          Este navegador não permite guardar nada: os cálculos recentes não ficam guardados, e
          defensor(a), órgão e tema valem só até recarregar ou fechar a página.
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
        autoComplete="off"
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
    </section>
  );
}
