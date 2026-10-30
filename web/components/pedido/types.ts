export interface SizeOption {
  kg: string;
  weight: number;
  porciones: string;
  portions: string;
  precio: string;
  rawPrice: number;
  popular?: boolean;
}

export interface BaseOption {
  id: string;
  nombre: string;
  sub: string;
  bg: string;
  border: string;
}

export interface FillingOption {
  id: string;
  nombre: string;
  sub: string;
  bg: string;
  border: string;
}

export interface CoverageOption {
  id: string;
  nombre: string;
  sub: string;
}

export type StepNumber = 1 | 2 | 3;
export type AccordionStep = 1 | 2 | 3 | 4;
