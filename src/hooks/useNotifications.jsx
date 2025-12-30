// Hook per gestire le notifiche push
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useNotifications(personaId, progettoId) {
  const [permission, setPermission] = useState(Notification.permission)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (personaId && progettoId) {
      checkUnread()
      // Controlla ogni 60 secondi
      const interval = setInterval(checkUnread, 60000)
      return () => clearInterval(interval)
    }
  }, [personaId, progettoId])

  const checkUnread = async () => {
    // Conta richieste in attesa di approvazione (per supervisor)
    const { count: pendingRequests } = await supabase
      .from('richieste_assenze')
      .select('*', { count: 'exact', head: true })
      .eq('progetto_id', progettoId)
      .eq('stato', 'in_attesa')

    // Conta trasferimenti in attesa
    const { count: pendingTransfers } = await supabase
      .from('trasferimenti')
      .select('*', { count: 'exact', head: true })
      .eq('progetto_destinazione_id', progettoId)
      .eq('stato', 'in_attesa')

    const total = (pendingRequests || 0) + (pendingTransfers || 0)
    
    // Se ci sono nuove notifiche, mostra notifica browser
    if (total > unreadCount && unreadCount > 0 && permission === 'granted') {
      showBrowserNotification('Presenze Cantiere', {
        body: `Hai ${total} richieste in attesa di approvazione`,
        icon: '/icons/icon-192.png',
        tag: 'pending-requests'
      })
    }
    
    setUnreadCount(total)
  }

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.log('Browser non supporta notifiche')
      return false
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }

  const showBrowserNotification = (title, options = {}) => {
    if (permission !== 'granted') return

    const notification = new Notification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [200, 100, 200],
      ...options
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    // Chiudi dopo 5 secondi
    setTimeout(() => notification.close(), 5000)
  }

  // Notifica per eventi specifici
  const notifyNewRequest = (tipo, persona) => {
    showBrowserNotification('Nuova Richiesta', {
      body: `${persona} ha richiesto ${tipo}`,
      tag: 'new-request'
    })
  }

  const notifyRequestApproved = (tipo) => {
    showBrowserNotification('Richiesta Approvata! ✅', {
      body: `La tua richiesta di ${tipo} è stata approvata`,
      tag: 'request-approved'
    })
  }

  const notifyRequestRejected = (tipo) => {
    showBrowserNotification('Richiesta Rifiutata ❌', {
      body: `La tua richiesta di ${tipo} è stata rifiutata`,
      tag: 'request-rejected'
    })
  }

  const notifyCheckInReminder = () => {
    showBrowserNotification('Promemoria Check-in 📍', {
      body: 'Non dimenticare di registrare la tua presenza!',
      tag: 'checkin-reminder'
    })
  }

  return {
    permission,
    unreadCount,
    requestPermission,
    showBrowserNotification,
    notifyNewRequest,
    notifyRequestApproved,
    notifyRequestRejected,
    notifyCheckInReminder
  }
}

// Componente per gestire permessi notifiche
export function NotificationPermissionBanner({ onEnable }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Mostra banner dopo 5 secondi
      const timer = setTimeout(() => setShow(true), 5000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleEnable = async () => {
    const granted = await onEnable()
    if (granted) setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 bg-white rounded-2xl shadow-lg border p-4 z-40 animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">Attiva le notifiche</p>
          <p className="text-sm text-gray-500 mt-1">
            Ricevi avvisi per approvazioni, promemoria check-in e altro
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShow(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Non ora
            </button>
            <button
              onClick={handleEnable}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Attiva
            </button>
          </div>
        </div>
        <button onClick={() => setShow(false)} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  )
}

export default useNotifications
