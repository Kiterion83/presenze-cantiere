/**
 * Pagina RapportinoPage
 * Inserimento rapportino giornaliero con presenze
 */

import { useState, useEffect } from 'react'
import { MapPin, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { SimpleCard, StatCard } from '../components/ui/Card'
import Button from '../components/ui/Button'
import RapportinoForm from '../components/forms/RapportinoForm'
import { checkIn, formatDistanza } from '../lib/gps'
import { formatOra } from '../lib/utils'

export default function RapportinoPage({ utente }) {
  const [checkInEffettuato, setCheckInEffettuato] = useState(false)
  const [checkInData, setCheckInData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState('')

  // Esegui check-in GPS
  const handleCheckIn = async () => {
    setLoading(true)
    setErrore('')
    
    const risultato = await checkIn()
    
    if (risultato.success) {
      setCheckInData(risultato)
      setCheckInEffettuato(true)
    } else {
      setErrore(risultato.error)
    }
    
    setLoading(false)
  }

  // Se non ha fatto check-in, mostra schermata check-in
  if (!checkInEffettuato) {
    return (
      <div className="max-w-lg mx-auto">
        <SimpleCard>
          <div className="text-center py-8">
            {/* Icona */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              errore ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              {loading ? (
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              ) : errore ? (
                <AlertCircle className="w-10 h-10 text-red-600" />
              ) : (
                <MapPin className="w-10 h-10 text-blue-600" />
              )}
            </div>

            {/* Titolo */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Check-in Cantiere
            </h2>
            <p className="text-gray-500 mb-6">
              Prima di compilare il rapportino, registra la tua presenza in cantiere
            </p>

            {/* Errore */}
            {errore && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                <p className="text-red-700 text-sm">{errore}</p>
              </div>
            )}

            {/* Info utente */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Stai accedendo come</p>
              <p className="font-semibold text-gray-900">{utente.nome}</p>
              <p className="text-sm text-blue-600">{utente.ruolo}</p>
            </div>

            {/* Bottone check-in */}
            <Button
              onClick={handleCheckIn}
              loading={loading}
              size="lg"
              fullWidth
              icon={<MapPin size={20} />}
            >
              {loading ? 'Rilevamento GPS...' : 'Effettua Check-in'}
            </Button>

            {/* Note */}
            <p className="text-xs text-gray-400 mt-4">
              Il GPS verrà utilizzato per verificare la tua presenza nell'area del cantiere
            </p>
          </div>
        </SimpleCard>
      </div>
    )
  }

  // Check-in effettuato - mostra form rapportino
  return (
    <div className="space-y-6">
      {/* Banner check-in */}
      <div className={`p-4 rounded-xl flex items-center gap-4 ${
        checkInData?.inArea 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-amber-50 border border-amber-200'
      }`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          checkInData?.inArea ? 'bg-green-500' : 'bg-amber-500'
        }`}>
          {checkInData?.inArea ? (
            <CheckCircle className="w-6 h-6 text-white" />
          ) : (
            <AlertCircle className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="flex-1">
          <p className={`font-semibold ${
            checkInData?.inArea ? 'text-green-800' : 'text-amber-800'
          }`}>
            {checkInData?.inArea ? 'Check-in Confermato' : 'Fuori Area Cantiere'}
          </p>
          <p className={`text-sm ${
            checkInData?.inArea ? 'text-green-600' : 'text-amber-600'
          }`}>
            {checkInData?.messaggio}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Ora check-in</p>
          <p className="font-mono font-semibold">
            {checkInData?.timestamp ? formatOra(checkInData.timestamp) : '--:--'}
          </p>
        </div>
      </div>

      {/* Stats rapide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Distanza"
          value={checkInData?.distanza ? formatDistanza(checkInData.distanza) : '-'}
          icon={<MapPin size={24} />}
        />
        <StatCard
          title="Raggio Max"
          value={checkInData?.raggioMax ? `${checkInData.raggioMax}m` : '-'}
          icon={<MapPin size={24} />}
        />
        <StatCard
          title="Check-in"
          value={checkInData?.timestamp ? formatOra(checkInData.timestamp) : '-'}
          icon={<Clock size={24} />}
        />
        <StatCard
          title="Stato"
          value={checkInData?.inArea ? 'In Area' : 'Fuori Area'}
          icon={checkInData?.inArea ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
        />
      </div>

      {/* Form rapportino */}
      <RapportinoForm utente={utente} />
    </div>
  )
}
