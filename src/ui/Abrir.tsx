import { useId, useState } from "react";
import { formatarDataHoraBrasilia } from "../indices/relogio.ts";
import { Ajuda } from "./componentes/Ajuda.tsx";
import type { Recente } from "./recentes.ts";

/**
 * Conteúdo do painel "Abrir" (§5.5, §9.1): os cálculos recentes deste navegador, por data,
 * processo e partes, com "Abrir" e "Remover" em cada um e "Limpar recentes"; e a escolha de um
 * arquivo salvo. O arquivo é lido aqui (texto) e entregue a quem valida e recalcula.
 */
export function Abrir({
  recentes,
  recentesLigados,
  erro,
  aoAbrirRecente,
  aoRemoverRecente,
  aoLimparRecentes,
  aoAbrirTexto,
  aoFalharLeitura,
}: {
  recentes: Recente[];
  recentesLigados: boolean;
  /** frase de erro da última tentativa (arquivo inválido), ou nulo */
  erro: string | null;
  aoAbrirRecente: (recente: Recente) => void;
  aoRemoverRecente: (id: string) => void;
  aoLimparRecentes: () => void;
  aoAbrirTexto: (texto: string) => void;
  /** o navegador não conseguiu ler o arquivo escolhido (removido, sem permissão) */
  aoFalharLeitura: () => void;
}) {
  const idDoArquivo = useId();
  const [lendo, setLendo] = useState(false);
  const escolherArquivo = async (arquivo: File | undefined) => {
    if (arquivo === undefined) return;
    setLendo(true);
    try {
      aoAbrirTexto(await arquivo.text());
    } catch {
      aoFalharLeitura();
    } finally {
      setLendo(false);
    }
  };
  return (
    <div>
      <h3>Cálculos recentes neste navegador</h3>
      {!recentesLigados ? (
        <p className="nota">
          A opção "Guardar cálculos recentes neste navegador" está desligada na seção 1 · Processo.
          Ligue-a para os cinco últimos cálculos aparecerem aqui.
        </p>
      ) : recentes.length === 0 ? (
        <p className="nota">Nenhum cálculo recente ainda. Os cinco últimos aparecem aqui.</p>
      ) : (
        <ul className="lista-simples" aria-label="Cálculos recentes">
          {recentes.map((recente) => {
            const nome = recente.processo.trim() === "" ? "(sem nº de processo)" : recente.processo;
            const partes = [recente.exequente, recente.executado].filter((p) => p.trim() !== "");
            return (
              <li key={recente.id}>
                <span>
                  <strong>{nome}</strong>
                  {partes.length > 0 ? ` · ${partes.join(" × ")}` : ""}
                  <br />
                  <small>atualizado em {formatarDataHoraBrasilia(recente.atualizadoEm)}</small>
                </span>
                <button
                  type="button"
                  className="botao secundario"
                  onClick={() => aoAbrirRecente(recente)}
                  aria-label={`Abrir ${nome}, atualizado em ${formatarDataHoraBrasilia(recente.atualizadoEm)}`}
                >
                  Abrir
                </button>
                <button
                  type="button"
                  className="botao discreto"
                  onClick={() => aoRemoverRecente(recente.id)}
                  aria-label={`Remover ${nome}, atualizado em ${formatarDataHoraBrasilia(recente.atualizadoEm)}`}
                >
                  Remover
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {recentes.length > 0 ? (
        <div className="linha">
          <button type="button" className="botao discreto" onClick={aoLimparRecentes}>
            Limpar recentes
          </button>
        </div>
      ) : null}
      <h3>Arquivo salvo</h3>
      <div className="campo">
        <span className="rotulo-do-campo">
          <label htmlFor={idDoArquivo}>Abrir arquivo do Apura (.json)</label>
          <Ajuda assunto="Abrir arquivo">
            O cálculo é recalculado com os índices de hoje; se algum índice usado antes mudou, um
            aviso diz qual.
          </Ajuda>
        </span>
        <input
          id={idDoArquivo}
          type="file"
          accept=".json,application/json"
          disabled={lendo}
          onChange={(evento) => {
            void escolherArquivo(evento.target.files?.[0]);
            evento.target.value = "";
          }}
        />
        {erro ? (
          <p className="erro" role="alert">
            {erro}
          </p>
        ) : null}
      </div>
    </div>
  );
}
