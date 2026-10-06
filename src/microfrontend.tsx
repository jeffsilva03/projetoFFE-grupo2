import { createRoot, type Root } from 'react-dom/client';
import { Aplicacao } from './Aplicacao';
interface PropriedadesIntegracao { domElement: HTMLElement }
const raizes = new Map<HTMLElement, Root>();
export async function bootstrap() { /* Inicialização sem conexão externa nesta etapa. */ }
export async function mount({ domElement }: PropriedadesIntegracao) {
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
