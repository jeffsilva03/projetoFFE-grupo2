import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Aplicacao } from './Aplicacao';
import './estilos/base.css';
createRoot(document.getElementById('raiz')!).render(<StrictMode><Aplicacao /></StrictMode>);
