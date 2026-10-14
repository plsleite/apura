import { Component, type ReactNode } from "react";

/**
 * Tela de erro de reserva (§18.6): se o conteúdo lançar um erro ao ser montado (defeito do
 * programa, não dado do usuário, que o motor devolve como aviso), mostra a `reserva` no lugar, em
 * vez de apagar a página. O React exige um componente de classe para isso.
 */
export class Reserva extends Component<
  { children: ReactNode; reserva: ReactNode },
  { erro: boolean }
> {
  override state = { erro: false };

  static getDerivedStateFromError(): { erro: boolean } {
    return { erro: true };
  }

  override render(): ReactNode {
    return this.state.erro ? this.props.reserva : this.props.children;
  }
}
