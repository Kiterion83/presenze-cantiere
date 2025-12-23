/**
 * Componente BudgetChart
 * Grafico a barre orizzontali Budget vs Speso per centro di costo
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { CENTRI_COSTO, COLORI_GRAFICO, SOGLIE_BUDGET } from '../../lib/constants'

export default function BudgetChart({ oreSpese = [] }) {
  // Combina budget con ore spese
  const data = CENTRI_COSTO.map(cc => {
    const speso = oreSpese.find(o => o.codice === cc.codice)?.ore_spese || 0
    const percentuale = cc.budgetOre > 0 ? Math.round((speso / cc.budgetOre) * 100) : 0
    
    return {
      codice: cc.codice,
      fase: cc.fase,
      budget: cc.budgetOre,
      speso: speso,
      percentuale,
      stato: percentuale >= 100 ? 'over' : percentuale >= SOGLIE_BUDGET.OK ? 'attenzione' : 'ok',
    }
  })

  // Colore barra in base allo stato
  const getColoreBarra = (stato) => {
    switch (stato) {
      case 'over': return COLORI_GRAFICO.overBudget
      case 'attenzione': return '#f59e0b' // amber-500
      default: return COLORI_GRAFICO.speso
    }
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{item.fase}</p>
          <p className="text-sm text-gray-500">{item.codice}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="text-gray-500">Budget:</span>{' '}
              <span className="font-medium">{item.budget}h</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-500">Speso:</span>{' '}
              <span className="font-medium">{item.speso}h</span>
            </p>
            <p className={`text-sm font-medium ${
              item.stato === 'over' ? 'text-red-600' :
              item.stato === 'attenzione' ? 'text-amber-600' : 'text-green-600'
            }`}>
              {item.percentuale}% del budget
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}h`} />
          <YAxis 
            type="category" 
            dataKey="codice" 
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Barra budget (sfondo) */}
          <Bar 
            dataKey="budget" 
            fill={COLORI_GRAFICO.budget} 
            name="Budget"
            radius={[0, 4, 4, 0]}
          />
          
          {/* Barra speso (sovrapposta) */}
          <Bar 
            dataKey="speso" 
            name="Speso"
            radius={[0, 4, 4, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColoreBarra(entry.stato)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Variante compatta (senza etichette Y)
export function BudgetChartCompatto({ oreSpese = [] }) {
  const data = CENTRI_COSTO.map(cc => {
    const speso = oreSpese.find(o => o.codice === cc.codice)?.ore_spese || 0
    const percentuale = cc.budgetOre > 0 ? Math.round((speso / cc.budgetOre) * 100) : 0
    
    return {
      codice: cc.codice,
      fase: cc.fase.substring(0, 15) + (cc.fase.length > 15 ? '...' : ''),
      budget: cc.budgetOre,
      speso: speso,
      percentuale,
    }
  })

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="codice" 
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tickFormatter={(v) => `${v}h`} />
          <Tooltip />
          <Legend />
          <Bar dataKey="budget" fill={COLORI_GRAFICO.budget} name="Budget" />
          <Bar dataKey="speso" fill={COLORI_GRAFICO.speso} name="Speso" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Indicatore singolo budget
export function BudgetIndicatore({ codice, fase, budget, speso }) {
  const percentuale = budget > 0 ? Math.round((speso / budget) * 100) : 0
  const stato = percentuale >= 100 ? 'over' : percentuale >= SOGLIE_BUDGET.OK ? 'attenzione' : 'ok'
  
  const colori = {
    ok: 'bg-green-500',
    attenzione: 'bg-amber-500',
    over: 'bg-red-500',
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{fase}</span>
        <span className={`font-medium ${
          stato === 'over' ? 'text-red-600' :
          stato === 'attenzione' ? 'text-amber-600' : 'text-gray-900'
        }`}>
          {speso}h / {budget}h ({percentuale}%)
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colori[stato]} transition-all duration-500`}
          style={{ width: `${Math.min(100, percentuale)}%` }}
        />
      </div>
    </div>
  )
}
