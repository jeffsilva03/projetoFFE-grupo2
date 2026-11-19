import { createRoot, type Root } from 'react-dom/client';
import { Aplicacao } from './Aplicacao';
import { registrarSocket, type ConexaoComandos } from './comandos/comandos';

/** O App Shell entrega a conexão dele ao barramento de comandos do G2 (6.3). */
export { registrarSocket };
interface PropriedadesIntegracao { domElement: HTMLElement; socket?: ConexaoComandos }
const raizes = new Map<HTMLElement, Root>();
export async function bootstrap() { /* Inicialização sem conexão externa nesta etapa. */ }
export async function mount({ domElement, socket }: PropriedadesIntegracao) {
  if (socket) registrarSocket(socket);
  if (!domElement) throw new Error('Informe domElement para montar a IHM.');
  if (raizes.has(domElement)) return;
  const raiz = createRoot(domElement);
  raizes.set(domElement, raiz);
  raiz.render(<Aplicacao />);
}
export async function unmount({ domElement }: PropriedadesIntegracao) {
  raizes.get(domElement)?.unmount();
  raizes.delete(domElement);
}
