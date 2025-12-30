import { useState, useEffect } from 'react'

// Test senza supabase prima
function App() {
  const [step, setStep] = useState('init')
  
  useEffect(() => {
    console.log('STEP 1: useEffect started')
    setStep('effect_started')
    
    // Test import dinamico di supabase
    import('./lib/supabase').then(({ supabase }) => {
      console.log('STEP 2: supabase imported')
      setStep('supabase_ok')
      
      supabase.auth.getSession().then(({ data, error }) => {
        console.log('STEP 3: getSession done', error || 'OK')
        if (error) {
          setStep('session_error: ' + error.message)
        } else if (data.session) {
          setStep('logged_in: ' + data.session.user.email)
        } else {
          setStep('not_logged_in')
        }
      }).catch(err => {
        console.log('STEP 3: getSession exception', err)
        setStep('session_exception: ' + err.message)
      })
    }).catch(err => {
      console.log('STEP 2: supabase import failed', err)
      setStep('supabase_error: ' + err.message)
    })
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🔧 Test Minimale</h1>
      
      <div style={{ 
        background: '#fef3c7', 
        padding: '16px', 
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <p><strong>Stato:</strong> {step}</p>
      </div>

      <div style={{ 
        background: step.includes('error') || step.includes('exception') ? '#fee2e2' : '#d1fae5', 
        padding: '16px', 
        borderRadius: '8px' 
      }}>
        {step === 'init' && <p>⏳ Inizializzazione...</p>}
        {step === 'effect_started' && <p>⏳ useEffect partito...</p>}
        {step === 'supabase_ok' && <p>✅ Supabase importato, controllo sessione...</p>}
        {step.startsWith('logged_in') && <p>✅ Login OK!</p>}
        {step === 'not_logged_in' && <p>ℹ️ Non loggato - OK, funziona!</p>}
        {step.includes('error') && <p>❌ Errore: {step}</p>}
        {step.includes('exception') && <p>❌ Eccezione: {step}</p>}
      </div>

      <div style={{ marginTop: '20px' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Se vedi questo messaggio, React funziona!
        </p>
      </div>
    </div>
  )
}

export default App
