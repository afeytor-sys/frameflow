'use client'

import { useEffect, useState } from 'react'
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning,
  CloudDrizzle, Wind, Loader2, MapPin,
} from 'lucide-react'

interface WeatherData {
  temp: number
  weatherCode: number
  city: string
}

// WMO Weather interpretation codes → icon + label
function getWeatherInfo(code: number): { icon: React.ElementType; label: string; color: string } {
  if (code === 0)                    return { icon: Sun,            label: 'Sonnig',       color: '#F59E0B' }
  if (code <= 2)                     return { icon: Cloud,          label: 'Cloudy',      color: '#94A3B8' }
  if (code === 3)                    return { icon: Cloud,          label: 'Bedeckt',      color: '#64748B' }
  if (code >= 51 && code <= 57)      return { icon: CloudDrizzle,   label: 'Nieselregen',  color: '#60A5FA' }
  if (code >= 61 && code <= 67)      return { icon: CloudRain,      label: 'Regen',        color: '#3B82F6' }
  if (code >= 71 && code <= 77)      return { icon: CloudSnow,      label: 'Schnee',       color: '#BAE6FD' }
  if (code >= 80 && code <= 82)      return { icon: CloudRain,      label: 'Schauer',      color: '#3B82F6' }
  if (code >= 95 && code <= 99)      return { icon: CloudLightning, label: 'Gewitter',     color: '#A78BFA' }
  if (code >= 20 && code <= 29)      return { icon: Wind,           label: 'Windig',       color: '#94A3B8' }
  return { icon: Cloud, label: 'Cloudy', color: '#94A3B8' }
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=de`,
      { headers: { 'User-Agent': 'Fotonizer/1.0' } }
    )
    const data = await res.json()
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.county ||
      'Dein Standort'
    )
  } catch {
    return 'Dein Standort'
  }
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) { setLoading(false); return }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          const [weatherRes, city] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
            ),
            reverseGeocode(lat, lon),
          ])
          const weatherData = await weatherRes.json()
          setWeather({
            temp: Math.round(weatherData.current.temperature_2m),
            weatherCode: weatherData.current.weather_code,
            city,
          })
        } catch {
          // silently fail
        }
        setLoading(false)
      },
      () => {
        setDenied(true)
        setLoading(false)
      },
      { timeout: 8000 }
    )
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
        style={{ color: 'var(--text-muted)' }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </div>
    )
  }

  if (denied || !weather) return null

  const { icon: WeatherIcon, label, color } = getWeatherInfo(weather.weatherCode)

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
      style={{
        background: 'var(--bg-hover)',
        border: '1px solid var(--border-color)',
      }}
      title={`${label} in ${weather.city}`}
    >
      <WeatherIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
      <span
        className="text-[13px] font-bold tabular-nums"
        style={{ color: 'var(--text-primary)' }}
      >
        {weather.temp}°
      </span>
      <span
        className="hidden sm:flex items-center gap-1 text-[11.5px] font-medium"
        style={{ color: 'var(--text-muted)' }}
      >
        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
        {weather.city}
      </span>
    </div>
  )
}
