export interface RDStationFormsInstance {
  createForm(): void
}

export interface RDStationFormsConstructor {
  new (formEmbedId: string, trackingOrSecondaryId?: string): RDStationFormsInstance
}

declare global {
  interface Window {
    /** Classe injetada por rdstation-forms.min.js quando o script termina de carregar. */
    RDStationForms?: RDStationFormsConstructor
    /** Marcador opcional para deduplicar injeção do script entre instâncias. */
    __rdStationFormsScriptPromise?: Promise<void>
  }
}

export {}
