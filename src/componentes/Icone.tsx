import type { CSSProperties } from 'react';
type NomeIcone = 'painel' | 'escudo' | 'ajustes' | 'iniciar' | 'parar' | 'rearmar' | 'alarme' | 'confirmar' | 'esquerda' | 'direita' | 'expandir' | 'informacao';
const caminhos: Record<NomeIcone, string> = {
  painel: 'M3 4h18v13H3z M8 21h8 M12 17v4 M6 8h4 M6 12h4 M14 8h4 M14 12h4',
  escudo: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  ajustes: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
  iniciar: 'M8 5l11 7-11 7z', parar: 'M6 6h12v12H6z',
  rearmar: 'M3 10a9 9 0 1 1 2 8 M3 4v6h6',
  alarme: 'M12 3L2 21h20z M12 9v5 M12 17v1',
  confirmar: 'M4 12l5 5L20 6', esquerda: 'M11 6l-6 6 6 6 M19 6l-6 6 6 6',
  direita: 'M5 6l6 6-6 6 M13 6l6 6-6 6',
  expandir: 'M3 9V3h6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6',
  informacao: 'M12 8v1 M12 12v5 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
};
export function Icone({ nome, tamanho = 20, estilo }: { nome: NomeIcone; tamanho?: number; estilo?: CSSProperties }) {
  return <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={estilo}><path d={caminhos[nome]} /></svg>;
}
export function SimboloSmart({ tamanho = 34 }: { tamanho?: number }) {
  return <svg width={tamanho} height={tamanho} viewBox="0 0 40 44" aria-hidden="true"><path d="M20 2 37 12 20 22 3 12Z" fill="#0284c7"/><path d="M3 14 18 23v18L3 32Z" fill="#ef4444"/><path d="M22 23 37 14v18l-15 9Z" fill="#22c55e"/><path d="m3 28 15 9v4L3 32Zm19 9 15-9v4l-15 9Z" fill="#facc15"/></svg>;
}
