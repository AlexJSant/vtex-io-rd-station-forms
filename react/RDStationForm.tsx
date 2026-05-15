import React, { useCallback, useEffect, useRef, useState } from 'react'

import { ensureRdStationFormsScript } from './loadRdStationScript'
import styles from './styles.css'

export interface RDStationFormProps {
  /**
   * Id do elemento onde o formulário é montado — deve coincidir com o código gerado pela RD
   * (`new RDStationForms('este-valor', …).createForm()`).
   */
  formId: string
  /** Segundo argumento opcional do construtor RD (ex.: UA), quando aplicável ao seu snippet. */
  identifier?: string
  className?: string
  /**
   * Futuro: título opcional acima do formulário (`<h2 className={styles.title}>`).
   * Desativado porque o formulário RD já inclui títulos. Para reativar, descomente a prop,
   * o trecho no `return`, `defaultProps` e `schema` abaixo.
   */
  // title?: string
  /** Quando true, exibe estado de carregamento até createForm completar. */
  showLoading?: boolean
  /** Mensagem customizada durante carregamento. */
  loadingLabel?: string
  /** Mensagem amigável quando falha script ou inicialização (detalhes técnicos ficam em sr-only). */
  errorFallbackLabel?: string
  /** Reservado para integrações futuras; disparado após createForm() síncrono da RD. */
  onSuccess?: () => void
}

/** Contagem por anchor id para tolerar Strict Mode e múltiplas montagens sem falsos positivos no cleanup. */
const anchorMountCounts = new Map<string, number>()

function RDStationForm(props: RDStationFormProps) {
  const {
    formId,
    identifier,
    className,
    showLoading = true,
    loadingLabel = 'Carregando formulário…',
    errorFallbackLabel = 'Não foi possível carregar o formulário. Tente novamente em instantes.',
    onSuccess,
  } = props

  const mountRef = useRef<HTMLDivElement | null>(null)
  const createdRef = useRef(false)

  const [loading, setLoading] = useState(showLoading)
  const [error, setError] = useState<string | null>(null)

  const anchorId = formId.trim()

  const clearMount = useCallback(() => {
    const el = mountRef.current

    if (!el) {
      return
    }

    while (el.firstChild) {
      el.removeChild(el.firstChild)
    }
  }, [])

  useEffect(() => {
    createdRef.current = false

    let cancelled = false

    if (!anchorId) {
      setError('formId inválido.')
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    const currentCount = anchorMountCounts.get(anchorId) ?? 0

    anchorMountCounts.set(anchorId, currentCount + 1)

    if (currentCount > 0) {
      /**
       * IDs duplicados quebram getElementById e podem gerar comportamento indefinido na RD.
       * Mantemos execução, mas alertamos para correção no Site Editor (valor único por bloco).
       */
      console.warn(
        '[RDStationForm] formId duplicado na página; cada bloco deve usar o id gerado pela RD.',
        anchorId
      )
    }

    const run = async () => {
      if (showLoading) {
        setLoading(true)
      }

      setError(null)

      try {
        await ensureRdStationFormsScript()

        if (cancelled || !mountRef.current) {
          return
        }

        clearMount()

        const RDForms = window.RDStationForms

        if (!RDForms) {
          throw new Error('RDStationForms indisponível após carregar o script.')
        }

        if (createdRef.current) {
          return
        }

        createdRef.current = true

        /** Contrato solicitado: formId + identifier opcional no construtor RD. */
        new RDForms(anchorId, identifier ?? '').createForm()

        if (typeof onSuccess === 'function') {
          onSuccess()
        }

        if (!cancelled && showLoading) {
          setLoading(false)
        }
      } catch (e) {
        createdRef.current = false

        const message =
          e instanceof Error ? e.message : '[RDStationForm] Erro desconhecido.'

        if (!cancelled) {
          setError(message)

          if (showLoading) {
            setLoading(false)
          }
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      createdRef.current = false

      const nextCount = (anchorMountCounts.get(anchorId) ?? 1) - 1

      if (nextCount <= 0) {
        anchorMountCounts.delete(anchorId)
      } else {
        anchorMountCounts.set(anchorId, nextCount)
      }

      clearMount()
    }
  }, [anchorId, clearMount, identifier, onSuccess, showLoading])

  const rootClassName = [styles.container, className].filter(Boolean).join(' ')

  return (
    <section className={rootClassName} data-rd-station-form-wrapper>
      {/* Futuro: cabeçalho local — formulário RD já traz título.
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      */}

      {showLoading && loading ? (
        <p className={styles.loading} aria-live="polite">
          {loadingLabel}
        </p>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {errorFallbackLabel}
          <span className={styles.srOnly}>{error}</span>
        </p>
      ) : null}

      <div className={styles.formWrapper}>
        <div ref={mountRef} id={anchorId} role="main" />
      </div>
    </section>
  )
}

RDStationForm.defaultProps = {
  formId: '',
  identifier: '',
  // title: '',
  showLoading: true,
  loadingLabel: 'Carregando formulário…',
  errorFallbackLabel:
    'Não foi possível carregar o formulário. Tente novamente em instantes.',
}

RDStationForm.schema = {
  title: 'RD Station Form',
  description:
    'Insere formulários RD Station diretamente no DOM da loja (sem iframe). Informe o formId exatamente como no código gerado pela RD.',
  type: 'object',
  properties: {
    formId: {
      title: 'Form embed ID',
      description:
        'Id do elemento gerado pela RD — primeiro argumento em new RDStationForms(...). Deve ser único por bloco na página.',
      type: 'string',
      default: '',
    },
    identifier: {
      title: 'Identificador secundário',
      description:
        'Opcional — segundo argumento do snippet RD (ex.: UA), quando utilizado pela sua conta.',
      type: 'string',
      default: '',
    },
    /* Futuro: reativar junto com prop `title` e H2 no JSX.
    title: {
      title: 'Título exibido',
      description: 'Título opcional acima do formulário.',
      type: 'string',
      default: '',
    },
    */
    showLoading: {
      title: 'Mostrar carregamento',
      type: 'boolean',
      default: true,
    },
    loadingLabel: {
      title: 'Texto de carregamento',
      type: 'string',
      default: 'Carregando formulário…',
    },
    errorFallbackLabel: {
      title: 'Mensagem de erro',
      type: 'string',
      default:
        'Não foi possível carregar o formulário. Tente novamente em instantes.',
    },
  },
}

export default RDStationForm
