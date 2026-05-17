import { useMemo } from 'react'
import {
  Area, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer,
  Scatter, Tooltip, XAxis, YAxis
} from 'recharts'
import type { PingSample } from '@shared/types'

interface Props {
  samples: PingSample[]
  threshold: number
  height?: number
}

export default function LatencyGraph({ samples, threshold, height = 280 }: Props) {
  const { data, lossData, maxRtt } = useMemo(() => {
    const data = samples.map(s => ({ t: s.t, rtt: s.rttMs }))
    const lossData = samples
      .filter(s => s.rttMs === null)
      .map(s => ({ t: s.t, y: 0 }))
    let m = threshold * 1.2
    for (const s of samples) if (s.rttMs !== null && s.rttMs > m) m = s.rttMs
    const maxRtt = Math.ceil(m / 10) * 10
    return { data, lossData, maxRtt }
  }, [samples, threshold])

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="rttFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f2533" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={t => new Date(t).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
            stroke="#475569"
            fontSize={11}
            allowDuplicatedCategory={false}
          />
          <YAxis
            domain={[0, maxRtt]}
            tickFormatter={v => `${v}`}
            stroke="#475569"
            fontSize={11}
            width={48}
          />
          <Tooltip
            contentStyle={{ background: '#11141b', border: '1px solid #262c3a', borderRadius: 8 }}
            labelStyle={{ color: '#cbd5e1' }}
            itemStyle={{ color: '#e2e8f0' }}
            labelFormatter={(t: any) => new Date(t as number).toLocaleTimeString()}
            formatter={(v: any) => [v == null ? 'timeout' : `${Math.round(v as number)} ms`, 'RTT']}
          />
          <ReferenceLine
            y={threshold}
            stroke="#f97316"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
            label={{ value: `${threshold} ms`, position: 'insideTopRight', fill: '#f97316', fontSize: 10 }}
          />
          <Area
            data={data}
            type="monotone"
            dataKey="rtt"
            stroke="#38bdf8"
            strokeWidth={1.75}
            fill="url(#rttFill)"
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
          <Scatter
            data={lossData}
            dataKey="y"
            fill="#ef4444"
            isAnimationActive={false}
            shape="circle"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
