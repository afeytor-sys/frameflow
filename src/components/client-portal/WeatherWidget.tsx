'use client'

import { useEffect, useState } from 'react'
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind } from 'lucide-react'

interface WeatherData {
  temp: number
  condition: string
  code: number
}

interface Props {
  date: string       // ISO date string e.g. "2026-04-15"
  location: string   // city name for display only
  lat?: number
  lon?: number
}

function getWeatherIcon(code: number) {
  if (code === 0) return <Sun className="w-5 h-5 text-[#CC8415]" />
  if (code <= 3) return <Cloud className="w-5 h-5 text-[#9CA3AF]" />
  if (code <= 67) return <CloudRain className="w-5 h-5 text-[#4B5563]" />
  if (code <= 77) return <CloudSnow className="w-5 h-5 text-[#6B7280]" />
  if (code <= 82) return <CloudRain className="w-5 h-5 text-[#4B5563]" />
  if (code <= 99) return <CloudLightning className="w-5 h-5 text-[#7C3AED]" />
  return <Wind className="w-5 h-5 text-[#9CA3AF]" />
}

function getWeatherLabel(code: number): string {
  if (code === 0) return 'Sonnig'
  if (code <= 3) return 'Cloudy'
  if (code <= 48) return 'Neblig'
  if (code <= 67) return 'Regen'
  if (code <= 77) return 'Schnee'
  if (code <= 82) return 'Schauer'
  if (code <= 99) return 'Gewitter'
  return 'Wechselhaft'
}

export default function WeatherWidget({ date, location, lat = 52.52, lon = 13.405 }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const shootDate = new Date(date)
    const today = new Date()
    const diffDays = Math.ceil((shootDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Only fetch if within 14 days
    if (diffDays < 0 || diffDays > 14) {
      setLoading(false)
      return
    }

    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBerlin&start_date=${date}&end_date=${date}`
        )
        const data = await res.json()
        if (data.daily?.weathercode?.[0] !== undefined) {
          setWeather({
            temp: Math.round((data.daily.temperature_2m_max[0] + data.daily.temperature_2m_min[0]) / 2),
            condition: getWeatherLabel(data.daily.weathercode[0]),
            code: data.daily.weathercode[0],
          })
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [date, lat, lon])

  if (loading || !weather) return null

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[#E2DED8]">
      <div className="w-9 h-9 rounded-xl bg-[#F7F7F5] flex items-center justify-center flex-shrink-0">
        {getWeatherIcon(weather.code)}
      </div>
      <div className="flex-1">
        <p className="text-[12px] text-[#A8A49E]">Wetter am Shooting-Tag</p>
        <p className="text-[13.5px] font-semibold text-[#0D0D0C]">
          {weather.condition} · {weather.temp}°C
        </p>
      </div>
      <p className="text-[11px] text-[#C4C0BA] flex-shrink-0">{location}</p>
    </div>
  )
}
