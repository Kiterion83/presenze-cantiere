/**
 * Componente TrendChart
 * Grafico linea/area per trend settimanale ore lavorate
 */

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { COLORI_GRAFICO } from '../../lib/constants'

export default function TrendChart({ dati = [], budgetGiornaliero = 48 }) {
  // Aggiungi linea budget ai dati
  const dataConBudget = dati.map(d => ({
    ...d,
    budget: budgetGiornaliero,
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{label}</p>
          {payload.map((p, i) => (
            <p key={i} className="text-sm" style={{ color: p.color }}>
              {p.name}: {p.value}h
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dataConBudget} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorOre" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORI_GRAFICO.speso} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORI_GRAFICO.speso} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="giorno" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `${v}h`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Area ore lavorate */}
          <Area
            type="monotone"
            dataKey="ore"
            stroke={COLORI_GRAFICO.speso}
            fill="url(#colorOre)"
            strokeWidth={2}
            name="Ore Lavorate"
          />
          
          {/* Linea budget */}
          <Line
            type="monotone"
            dataKey="budget"
            stroke={COLORI_GRAFICO.budget}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Budget Giornaliero"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Variante con solo linea
export function TrendLineChart({ dati = [] }) {
  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dati} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="giorno" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `${v}h`} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="ore"
            stroke={COLORI_GRAFICO.speso}
            strokeWidth={2}
            dot={{ fill: COLORI_GRAFICO.speso, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Grafico confronto settimane
export function ConfrontoSettimaneChart({ settimanaCorrente = [], settimanaPrecedente = [] }) {
  // Combina i dati
  const giorni = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
  const data = giorni.map((g, i) => ({
    giorno: g,
    corrente: settimanaCorrente[i] || 0,
    precedente: settimanaPrecedente[i] || 0,
  }))

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="giorno" />
          <YAxis tickFormatter={(v) => `${v}h`} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="corrente"
            stroke={COLORI_GRAFICO.speso}
            strokeWidth={2}
            name="Questa settimana"
            dot={{ fill: COLORI_GRAFICO.speso }}
          />
          <Line
            type="monotone"
            dataKey="precedente"
            stroke={COLORI_GRAFICO.budget}
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Settimana scorsa"
            dot={{ fill: COLORI_GRAFICO.budget }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Mini sparkline per card
export function Sparkline({ dati = [], colore = COLORI_GRAFICO.speso }) {
  return (
    <div className="h-[50px] w-[120px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dati}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={colore}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
