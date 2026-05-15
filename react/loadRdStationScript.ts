/** URL oficial estável do script de formulários integrados RD Station. */
export const RD_STATION_FORMS_SCRIPT_SRC =
  'https://d335luupugsy2.cloudfront.net/js/rdstation-forms/stable/rdstation-forms.min.js'

const SCRIPT_EL_SELECTOR = `script[src="${RD_STATION_FORMS_SCRIPT_SRC}"]`

function rdFormsReady(): boolean {
  return typeof window !== 'undefined' && typeof window.RDStationForms === 'function'
}

function pollRdFormsReady(timeoutMs: number): Promise<void> {
  const started = Date.now()

  return new Promise((resolve, reject) => {
    const tick = () => {
      if (rdFormsReady()) {
        resolve()
        return
      }

      if (Date.now() - started >= timeoutMs) {
        reject(
          new Error(
            '[RDStationForm] Timeout aguardando window.RDStationForms após carregar o script.'
          )
        )
        return
      }

      window.requestAnimationFrame(tick)
    }

    tick()
  })
}

function attachScript(): HTMLScriptElement {
  const script = document.createElement('script')

  script.src = RD_STATION_FORMS_SCRIPT_SRC
  script.async = true

  document.head.appendChild(script)

  return script
}

/**
 * Carrega o script RD uma única vez por página (promise global em window).
 * Reusa tag existente se já houver no DOM (mesmo antes do React montar).
 */
export function ensureRdStationFormsScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  if (rdFormsReady()) {
    return Promise.resolve()
  }

  if (!window.__rdStationFormsScriptPromise) {
    window.__rdStationFormsScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(
        SCRIPT_EL_SELECTOR
      ) as HTMLScriptElement | null

      const finalizeLoad = () => {
        pollRdFormsReady(15000).then(resolve).catch(reject)
      }

      if (existing) {
        if (existing.dataset.rdLoadError === '1') {
          reject(new Error('[RDStationForm] Script RD falhou anteriormente ao carregar.'))
          return
        }

        if (existing.dataset.rdLoaded === '1' || rdFormsReady()) {
          finalizeLoad()
          return
        }

        existing.addEventListener('load', () => {
          existing.dataset.rdLoaded = '1'
          finalizeLoad()
        })

        existing.addEventListener('error', () => {
          existing.dataset.rdLoadError = '1'
          reject(new Error('[RDStationForm] Falha ao carregar script RD existente.'))
        })

        return
      }

      const script = attachScript()

      script.addEventListener('load', () => {
        script.dataset.rdLoaded = '1'
        finalizeLoad()
      })

      script.addEventListener('error', () => {
        script.dataset.rdLoadError = '1'
        reject(new Error('[RDStationForm] Falha ao carregar rdstation-forms.min.js'))
      })
    }).catch(error => {
      window.__rdStationFormsScriptPromise = undefined
      throw error
    })
  }

  return window.__rdStationFormsScriptPromise
}
