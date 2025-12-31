'use client'

import { useMemo, useEffect, useState, useRef } from 'react'

// Size categories with their pixel values
type SizeCategory = 'tiny' | 'small' | 'medium' | 'large' | 'xlarge'
const sizeValues: Record<SizeCategory, number> = {
  tiny: 1,
  small: 2,
  medium: 3,
  large: 5,
  xlarge: 8
}

// Color options: two shades of cyan and gold (tertiary)
type StarColor = 'cyan-light' | 'cyan-dark' | 'gold'

// Parallax layer (affects movement intensity)
type ParallaxLayer = 1 | 2 | 3

// Parallax multipliers for each layer (back moves slower, front moves faster)
const LAYER_MULTIPLIERS: Record<ParallaxLayer, number> = { 1: 0.5, 2: 1.0, 3: 1.8 }

// Pulse data for electricity animation - chains through multiple nodes
interface Pulse {
  id: number
  path: number[] // Array of star indices forming the chain (6-15 nodes)
  currentSegment: number // Which segment we're currently on (0 to path.length - 2)
  segmentProgress: number // 0 to 1 for current segment
  speed: number
  color: 'cyan' | 'gold'
  fadeOut: number // 0 to 1, for fading after reaching final destination
}

// Illuminated star after pulse arrives
interface IlluminatedStar {
  starIdx: number
  brightness: number // 1 to 0, fading out
  color: 'cyan' | 'gold'
}

// Static nebula data - generated once
interface Nebula {
  id: number
  x: number // percentage position
  y: number // percentage position
  radius: number // base radius in pixels
  color: 'cyan' | 'gold'
}

// Illuminated nebula after pulse passes through
interface IlluminatedNebula {
  nebulaId: number
  brightness: number // 1 to 0, fading out
  color: 'cyan' | 'gold'
}

interface StarData {
  id: number
  x: number
  y: number
  sizeCategory: SizeCategory
  size: number
  opacity: number
  delay: number
  duration: number
  color: StarColor
  layer: ParallaxLayer
}

// Performant star field using CSS animations and canvas for connecting lines
export function GlobalStarField() {
  const [mounted, setMounted] = useState(false)
  const containerRef1 = useRef<HTMLDivElement>(null)
  const containerRef2 = useRef<HTMLDivElement>(null)
  const containerRef3 = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<StarData[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const offsetRef = useRef({ x: 0, y: 0 })
  const pulsesRef = useRef<Pulse[]>([])
  const illuminatedStarsRef = useRef<IlluminatedStar[]>([])
  const illuminatedNebulasRef = useRef<IlluminatedNebula[]>([])
  const connectionsRef = useRef<{ fromIdx: number; toIdx: number }[]>([])
  const pulseIdCounter = useRef(0)

  // Generate static nebulas once - these don't move with parallax
  const nebulas = useMemo<Nebula[]>(() => {
    const result: Nebula[] = []
    // Create 5-8 nebulas scattered across the screen
    const count = 5 + Math.floor(Math.random() * 4)

    for (let i = 0; i < count; i++) {
      result.push({
        id: i,
        x: 10 + Math.random() * 80, // percentage, keep away from edges
        y: 10 + Math.random() * 80,
        radius: 120 + Math.random() * 100, // 120-220px base radius
        color: Math.random() < 0.3 ? 'gold' : 'cyan'
      })
    }
    return result
  }, [])

  // Generate stars once with varied sizes, colors, and layers
  const stars = useMemo(() => {
    const result: StarData[] = []
    const sizeCategories: SizeCategory[] = ['tiny', 'small', 'medium', 'large', 'xlarge']
    const colors: StarColor[] = ['cyan-light', 'cyan-dark', 'gold']

    for (let i = 0; i < 400; i++) {
      // Size distribution: more small stars, fewer large ones
      const sizeRand = Math.random()
      let sizeCategory: SizeCategory
      if (sizeRand < 0.35) sizeCategory = 'tiny'
      else if (sizeRand < 0.60) sizeCategory = 'small'
      else if (sizeRand < 0.80) sizeCategory = 'medium'
      else if (sizeRand < 0.93) sizeCategory = 'large'
      else sizeCategory = 'xlarge'

      // Color distribution: mostly cyan, some gold
      const colorRand = Math.random()
      let color: StarColor
      if (colorRand < 0.45) color = 'cyan-light'
      else if (colorRand < 0.80) color = 'cyan-dark'
      else color = 'gold'

      // Layer distribution: more stars in back layers
      const layerRand = Math.random()
      let layer: ParallaxLayer
      if (layerRand < 0.5) layer = 1 // Back layer (slowest movement)
      else if (layerRand < 0.8) layer = 2 // Middle layer
      else layer = 3 // Front layer (fastest movement)

      // Opacity based on layer (back layers dimmer)
      const baseOpacity = layer === 1 ? 0.2 : layer === 2 ? 0.4 : 0.6
      const opacity = baseOpacity + Math.random() * 0.3

      result.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        sizeCategory,
        size: sizeValues[sizeCategory],
        opacity,
        delay: Math.random() * 5,
        duration: 2 + Math.random() * 3,
        color,
        layer
      })
    }
    starsRef.current = result
    return result
  }, [])

  useEffect(() => {
    setMounted(true)

    let animationFrame: number
    let targetX = 0
    let targetY = 0
    let lastPulseSpawn = 0
    const pulseSpawnInterval = 4500 // Spawn new pulse every 4.5 seconds

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      targetX = ((e.clientX - centerX) / centerX) * 80
      targetY = ((e.clientY - centerY) / centerY) * 80
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const drawConnectionsAndPulses = (timestamp: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Set canvas size to match window
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(dpr, dpr)

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      // Draw nebulas first (behind everything)
      // Update illuminated nebulas
      const activeIlluminatedNebulas: IlluminatedNebula[] = []
      for (const nebula of illuminatedNebulasRef.current) {
        nebula.brightness -= 0.008 // Slow fade
        if (nebula.brightness > 0) {
          activeIlluminatedNebulas.push(nebula)
        }
      }
      illuminatedNebulasRef.current = activeIlluminatedNebulas

      // Seeded random for consistent nebula details
      const seededRandom = (seed: number, offset: number = 0) => {
        const x = Math.sin(seed * 9301 + offset * 49297) * 49297
        return x - Math.floor(x)
      }

      // Draw each nebula with layered gradients and detailed textures
      nebulas.forEach((nebula) => {
        const nebulaX = (nebula.x / 100) * window.innerWidth
        const nebulaY = (nebula.y / 100) * window.innerHeight

        // Check if this nebula is illuminated
        const illuminated = illuminatedNebulasRef.current.find(n => n.nebulaId === nebula.id)
        const brightness = illuminated ? illuminated.brightness : 0
        const illuminationColor = illuminated ? illuminated.color : nebula.color

        // Layer 1: Outermost diffuse glow (largest)
        const layer1Radius = nebula.radius * 2.2
        const gradient1 = ctx.createRadialGradient(
          nebulaX, nebulaY, nebula.radius * 0.3,
          nebulaX, nebulaY, layer1Radius
        )

        if (illuminationColor === 'gold') {
          gradient1.addColorStop(0, `rgba(120, 80, 30, ${0.06 + brightness * 0.15})`)
          gradient1.addColorStop(0.4, `rgba(80, 50, 20, ${0.03 + brightness * 0.08})`)
          gradient1.addColorStop(1, 'rgba(40, 25, 10, 0)')
        } else {
          gradient1.addColorStop(0, `rgba(20, 40, 80, ${0.06 + brightness * 0.15})`)
          gradient1.addColorStop(0.4, `rgba(15, 30, 60, ${0.03 + brightness * 0.08})`)
          gradient1.addColorStop(1, 'rgba(10, 20, 40, 0)')
        }

        ctx.beginPath()
        ctx.arc(nebulaX, nebulaY, layer1Radius, 0, Math.PI * 2)
        ctx.fillStyle = gradient1
        ctx.fill()

        // Outer filaments - irregular tendrils extending outward (organic, not circular)
        const filamentCount = 6 + Math.floor(seededRandom(nebula.id, 300) * 5)
        for (let f = 0; f < filamentCount; f++) {
          const baseAngle = seededRandom(nebula.id, 310 + f) * Math.PI * 2
          const angleVariation = (seededRandom(nebula.id, 320 + f) - 0.5) * 0.3
          const length = nebula.radius * (0.8 + seededRandom(nebula.id, 330 + f) * 1.2)
          const thickness = 2 + seededRandom(nebula.id, 340 + f) * 4
          const filamentOpacity = (0.03 + brightness * 0.1) * (0.5 + seededRandom(nebula.id, 350 + f) * 0.5)

          // Draw curved filament using quadratic bezier
          const startX = nebulaX + Math.cos(baseAngle) * nebula.radius * 0.3
          const startY = nebulaY + Math.sin(baseAngle) * nebula.radius * 0.3
          const endX = nebulaX + Math.cos(baseAngle + angleVariation) * length
          const endY = nebulaY + Math.sin(baseAngle + angleVariation) * length
          // Control point offset perpendicular to the filament direction
          const perpAngle = baseAngle + Math.PI / 2
          const curvature = (seededRandom(nebula.id, 360 + f) - 0.5) * nebula.radius * 0.4
          const ctrlX = (startX + endX) / 2 + Math.cos(perpAngle) * curvature
          const ctrlY = (startY + endY) / 2 + Math.sin(perpAngle) * curvature

          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY)
          ctx.strokeStyle = illuminationColor === 'gold'
            ? `rgba(200, 150, 50, ${filamentOpacity})`
            : `rgba(0, 150, 200, ${filamentOpacity})`
          ctx.lineWidth = thickness * (0.5 + brightness * 0.5)
          ctx.lineCap = 'round'
          ctx.stroke()
        }

        // Layer 2: Mid glow
        const layer2Radius = nebula.radius * 1.4
        const gradient2 = ctx.createRadialGradient(
          nebulaX, nebulaY, nebula.radius * 0.2,
          nebulaX, nebulaY, layer2Radius
        )

        if (illuminationColor === 'gold') {
          gradient2.addColorStop(0, `rgba(200, 150, 50, ${0.08 + brightness * 0.25})`)
          gradient2.addColorStop(0.5, `rgba(150, 100, 30, ${0.04 + brightness * 0.12})`)
          gradient2.addColorStop(1, 'rgba(100, 60, 20, 0)')
        } else {
          gradient2.addColorStop(0, `rgba(0, 120, 180, ${0.08 + brightness * 0.25})`)
          gradient2.addColorStop(0.5, `rgba(0, 80, 140, ${0.04 + brightness * 0.12})`)
          gradient2.addColorStop(1, 'rgba(0, 50, 100, 0)')
        }

        ctx.beginPath()
        ctx.arc(nebulaX, nebulaY, layer2Radius, 0, Math.PI * 2)
        ctx.fillStyle = gradient2
        ctx.fill()

        // Internal texture - offset glowing patches for depth
        const patchCount = 4 + Math.floor(seededRandom(nebula.id, 100) * 3)
        for (let p = 0; p < patchCount; p++) {
          const angle = seededRandom(nebula.id, 10 + p) * Math.PI * 2
          const dist = nebula.radius * (0.2 + seededRandom(nebula.id, 20 + p) * 0.5)
          const patchX = nebulaX + Math.cos(angle) * dist
          const patchY = nebulaY + Math.sin(angle) * dist
          const patchRadius = nebula.radius * (0.15 + seededRandom(nebula.id, 30 + p) * 0.25)

          const patchGradient = ctx.createRadialGradient(
            patchX, patchY, 0,
            patchX, patchY, patchRadius
          )

          const patchOpacity = 0.03 + brightness * 0.12
          if (illuminationColor === 'gold') {
            patchGradient.addColorStop(0, `rgba(255, 200, 100, ${patchOpacity * 1.5})`)
            patchGradient.addColorStop(0.5, `rgba(200, 140, 50, ${patchOpacity})`)
            patchGradient.addColorStop(1, 'rgba(150, 100, 30, 0)')
          } else {
            patchGradient.addColorStop(0, `rgba(100, 200, 255, ${patchOpacity * 1.5})`)
            patchGradient.addColorStop(0.5, `rgba(0, 150, 220, ${patchOpacity})`)
            patchGradient.addColorStop(1, 'rgba(0, 100, 180, 0)')
          }

          ctx.beginPath()
          ctx.arc(patchX, patchY, patchRadius, 0, Math.PI * 2)
          ctx.fillStyle = patchGradient
          ctx.fill()
        }

        // Layer 3: Inner bright core
        const layer3Radius = nebula.radius * 0.8
        const gradient3 = ctx.createRadialGradient(
          nebulaX, nebulaY, 0,
          nebulaX, nebulaY, layer3Radius
        )

        if (illuminationColor === 'gold') {
          gradient3.addColorStop(0, `rgba(255, 220, 120, ${0.1 + brightness * 0.4})`)
          gradient3.addColorStop(0.3, `rgba(251, 191, 36, ${0.06 + brightness * 0.25})`)
          gradient3.addColorStop(0.7, `rgba(200, 140, 30, ${0.03 + brightness * 0.1})`)
          gradient3.addColorStop(1, 'rgba(150, 100, 20, 0)')
        } else {
          gradient3.addColorStop(0, `rgba(150, 230, 255, ${0.1 + brightness * 0.4})`)
          gradient3.addColorStop(0.3, `rgba(0, 200, 255, ${0.06 + brightness * 0.25})`)
          gradient3.addColorStop(0.7, `rgba(0, 150, 200, ${0.03 + brightness * 0.1})`)
          gradient3.addColorStop(1, 'rgba(0, 100, 150, 0)')
        }

        ctx.beginPath()
        ctx.arc(nebulaX, nebulaY, layer3Radius, 0, Math.PI * 2)
        ctx.fillStyle = gradient3
        ctx.fill()

        // Inner structure - irregular curved wisps (not circular arcs)
        const wispCount = 5 + Math.floor(seededRandom(nebula.id, 200) * 4)
        for (let w = 0; w < wispCount; w++) {
          const wispOpacity = 0.03 + brightness * 0.1

          // Create an S-curve or irregular path within the nebula
          const startAngle = seededRandom(nebula.id, 50 + w) * Math.PI * 2
          const startDist = nebula.radius * (0.1 + seededRandom(nebula.id, 51 + w) * 0.3)
          const endAngle = startAngle + (seededRandom(nebula.id, 52 + w) - 0.3) * Math.PI * 0.8
          const endDist = nebula.radius * (0.5 + seededRandom(nebula.id, 53 + w) * 0.4)

          const startX = nebulaX + Math.cos(startAngle) * startDist
          const startY = nebulaY + Math.sin(startAngle) * startDist
          const endX = nebulaX + Math.cos(endAngle) * endDist
          const endY = nebulaY + Math.sin(endAngle) * endDist

          // Two control points for a more complex curve
          const ctrl1Angle = startAngle + (seededRandom(nebula.id, 54 + w) - 0.5) * 0.5
          const ctrl1Dist = nebula.radius * (0.2 + seededRandom(nebula.id, 55 + w) * 0.3)
          const ctrl2Angle = endAngle + (seededRandom(nebula.id, 56 + w) - 0.5) * 0.5
          const ctrl2Dist = nebula.radius * (0.3 + seededRandom(nebula.id, 57 + w) * 0.3)

          const ctrl1X = nebulaX + Math.cos(ctrl1Angle) * ctrl1Dist
          const ctrl1Y = nebulaY + Math.sin(ctrl1Angle) * ctrl1Dist
          const ctrl2X = nebulaX + Math.cos(ctrl2Angle) * ctrl2Dist
          const ctrl2Y = nebulaY + Math.sin(ctrl2Angle) * ctrl2Dist

          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, endX, endY)
          ctx.strokeStyle = illuminationColor === 'gold'
            ? `rgba(220, 180, 80, ${wispOpacity})`
            : `rgba(80, 180, 220, ${wispOpacity})`
          ctx.lineWidth = 1.5 + seededRandom(nebula.id, 80 + w) * 2.5
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      })

      // Calculate star positions with layer-based parallax
      const starPositions = starsRef.current.map(star => {
        const multiplier = LAYER_MULTIPLIERS[star.layer]
        return {
          x: (star.x / 100) * window.innerWidth + offsetRef.current.x * multiplier,
          y: (star.y / 100) * window.innerHeight + offsetRef.current.y * multiplier,
          opacity: star.opacity,
          color: star.color,
          layer: star.layer
        }
      })

      // Build connections and draw them
      const connectionDistance = 180
      const newConnections: { fromIdx: number; toIdx: number }[] = []

      for (let i = 0; i < starPositions.length; i++) {
        for (let j = i + 1; j < starPositions.length; j++) {
          if (Math.abs(starPositions[i].layer - starPositions[j].layer) > 1) continue

          const dx = starPositions[i].x - starPositions[j].x
          const dy = starPositions[i].y - starPositions[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < connectionDistance) {
            newConnections.push({ fromIdx: i, toIdx: j })

            // Draw the base connection line (more visible)
            const opacity = (1 - distance / connectionDistance) * 0.45
            ctx.beginPath()
            ctx.moveTo(starPositions[i].x, starPositions[i].y)
            ctx.lineTo(starPositions[j].x, starPositions[j].y)
            ctx.strokeStyle = `rgba(0, 212, 255, ${opacity})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      connectionsRef.current = newConnections

      // Build adjacency list for path finding
      const adjacencyList = new Map<number, number[]>()
      for (const conn of newConnections) {
        if (!adjacencyList.has(conn.fromIdx)) adjacencyList.set(conn.fromIdx, [])
        if (!adjacencyList.has(conn.toIdx)) adjacencyList.set(conn.toIdx, [])
        adjacencyList.get(conn.fromIdx)!.push(conn.toIdx)
        adjacencyList.get(conn.toIdx)!.push(conn.fromIdx)
      }

      // Function to find a chain of 6-15 connected stars
      const findChain = (startIdx: number, targetLength: number): number[] | null => {
        const path = [startIdx]
        const visited = new Set([startIdx])

        while (path.length < targetLength) {
          const current = path[path.length - 1]
          const neighbors = adjacencyList.get(current) || []
          const unvisited = neighbors.filter(n => !visited.has(n))

          if (unvisited.length === 0) break

          // Pick a random unvisited neighbor
          const next = unvisited[Math.floor(Math.random() * unvisited.length)]
          path.push(next)
          visited.add(next)
        }

        return path.length >= 6 ? path : null
      }

      // Spawn new pulse occasionally (only 1-2 at a time)
      const activePulseCount = pulsesRef.current.filter(p => p.fadeOut === 0).length
      if (timestamp - lastPulseSpawn > pulseSpawnInterval && newConnections.length > 0 && activePulseCount < 2) {
        // Find a starting star that has connections
        const connectedStars = Array.from(adjacencyList.keys())
        if (connectedStars.length > 0) {
          const startIdx = connectedStars[Math.floor(Math.random() * connectedStars.length)]
          const targetLength = 6 + Math.floor(Math.random() * 10) // 6-15 nodes
          const path = findChain(startIdx, targetLength)

          if (path && path.length >= 6) {
            lastPulseSpawn = timestamp
            const isGold = Math.random() < 0.3 // 30% chance for gold

            pulsesRef.current.push({
              id: pulseIdCounter.current++,
              path,
              currentSegment: 0,
              segmentProgress: 0,
              speed: 0.12 + Math.random() * 0.04, // Very fast pulse
              color: isGold ? 'gold' : 'cyan',
              fadeOut: 0
            })
          }
        }
      }

      // Draw illuminated stars (fading)
      const activeIlluminated: IlluminatedStar[] = []
      for (const star of illuminatedStarsRef.current) {
        star.brightness -= 0.015 // Fade speed

        if (star.brightness > 0) {
          activeIlluminated.push(star)

          const pos = starPositions[star.starIdx]
          if (pos) {
            // Draw illumination glow
            const glowSize = 25 * star.brightness
            const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowSize)
            if (star.color === 'gold') {
              gradient.addColorStop(0, `rgba(251, 191, 36, ${0.9 * star.brightness})`)
              gradient.addColorStop(0.3, `rgba(251, 191, 36, ${0.4 * star.brightness})`)
              gradient.addColorStop(1, 'rgba(251, 191, 36, 0)')
            } else {
              gradient.addColorStop(0, `rgba(103, 232, 249, ${0.95 * star.brightness})`)
              gradient.addColorStop(0.3, `rgba(0, 212, 255, ${0.5 * star.brightness})`)
              gradient.addColorStop(1, 'rgba(0, 212, 255, 0)')
            }

            ctx.beginPath()
            ctx.arc(pos.x, pos.y, glowSize, 0, Math.PI * 2)
            ctx.fillStyle = gradient
            ctx.fill()
          }
        }
      }
      illuminatedStarsRef.current = activeIlluminated

      // Update and draw pulses
      const activePulses: Pulse[] = []

      for (const pulse of pulsesRef.current) {
        if (pulse.fadeOut > 0) {
          // Pulse is fading out after reaching final destination
          pulse.fadeOut -= 0.015
          if (pulse.fadeOut > 0) {
            activePulses.push(pulse)

            // Draw fading trail along entire path
            ctx.beginPath()
            for (let i = 0; i < pulse.path.length; i++) {
              const pos = starPositions[pulse.path[i]]
              if (pos) {
                if (i === 0) ctx.moveTo(pos.x, pos.y)
                else ctx.lineTo(pos.x, pos.y)
              }
            }

            if (pulse.color === 'gold') {
              ctx.strokeStyle = `rgba(251, 191, 36, ${0.5 * pulse.fadeOut})`
            } else {
              ctx.strokeStyle = `rgba(0, 212, 255, ${0.6 * pulse.fadeOut})`
            }
            ctx.lineWidth = 2.5 * pulse.fadeOut
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.stroke()
          }
        } else {
          // Pulse is traveling through path segments
          pulse.segmentProgress += pulse.speed

          // Check if we've completed current segment
          if (pulse.segmentProgress >= 1) {
            // Move to next segment
            pulse.segmentProgress = 0
            pulse.currentSegment++

            // Illuminate the node we just reached
            if (pulse.currentSegment < pulse.path.length) {
              illuminatedStarsRef.current.push({
                starIdx: pulse.path[pulse.currentSegment],
                brightness: 1,
                color: pulse.color
              })
            }

            // Check if we've reached the end of the path
            if (pulse.currentSegment >= pulse.path.length - 1) {
              pulse.fadeOut = 1
              activePulses.push(pulse)
              continue
            }
          }

          activePulses.push(pulse)

          const fromIdx = pulse.path[pulse.currentSegment]
          const toIdx = pulse.path[pulse.currentSegment + 1]
          const from = starPositions[fromIdx]
          const to = starPositions[toIdx]

          if (from && to) {
            // Calculate current head position
            const headX = from.x + (to.x - from.x) * pulse.segmentProgress
            const headY = from.y + (to.y - from.y) * pulse.segmentProgress

            // Check if pulse head is inside any nebula and illuminate it
            nebulas.forEach((nebula) => {
              const nebulaX = (nebula.x / 100) * window.innerWidth
              const nebulaY = (nebula.y / 100) * window.innerHeight
              const dist = Math.sqrt(
                Math.pow(headX - nebulaX, 2) + Math.pow(headY - nebulaY, 2)
              )
              // Only illuminate if pulse passes through the inner core of the nebula
              if (dist < nebula.radius * 0.5) {
                const existing = illuminatedNebulasRef.current.find(n => n.nebulaId === nebula.id)
                if (!existing) {
                  illuminatedNebulasRef.current.push({
                    nebulaId: nebula.id,
                    brightness: 1,
                    color: pulse.color
                  })
                } else {
                  // Refresh brightness
                  existing.brightness = Math.max(existing.brightness, 0.8)
                  existing.color = pulse.color
                }
              }
            })

            // Draw completed segments of the trail (brighter)
            if (pulse.currentSegment > 0) {
              ctx.beginPath()
              for (let i = 0; i <= pulse.currentSegment; i++) {
                const pos = starPositions[pulse.path[i]]
                if (pos) {
                  if (i === 0) ctx.moveTo(pos.x, pos.y)
                  else ctx.lineTo(pos.x, pos.y)
                }
              }

              if (pulse.color === 'gold') {
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)'
              } else {
                ctx.strokeStyle = 'rgba(0, 212, 255, 0.7)'
              }
              ctx.lineWidth = 2.5
              ctx.lineCap = 'round'
              ctx.lineJoin = 'round'
              ctx.stroke()
            }

            // Draw current segment (from current node to head)
            ctx.beginPath()
            ctx.moveTo(from.x, from.y)
            ctx.lineTo(headX, headY)

            const segmentGradient = ctx.createLinearGradient(from.x, from.y, headX, headY)
            if (pulse.color === 'gold') {
              segmentGradient.addColorStop(0, 'rgba(251, 191, 36, 0.5)')
              segmentGradient.addColorStop(1, 'rgba(255, 220, 100, 0.95)')
            } else {
              segmentGradient.addColorStop(0, 'rgba(0, 212, 255, 0.6)')
              segmentGradient.addColorStop(1, 'rgba(150, 255, 255, 0.95)')
            }

            ctx.strokeStyle = segmentGradient
            ctx.lineWidth = 3
            ctx.lineCap = 'round'
            ctx.stroke()

            // Draw pulse head (bright leading point)
            const headGradient = ctx.createRadialGradient(headX, headY, 0, headX, headY, 14)
            if (pulse.color === 'gold') {
              headGradient.addColorStop(0, 'rgba(255, 240, 150, 1)')
              headGradient.addColorStop(0.3, 'rgba(251, 191, 36, 0.8)')
              headGradient.addColorStop(1, 'rgba(251, 191, 36, 0)')
            } else {
              headGradient.addColorStop(0, 'rgba(220, 255, 255, 1)')
              headGradient.addColorStop(0.3, 'rgba(103, 232, 249, 0.8)')
              headGradient.addColorStop(1, 'rgba(0, 212, 255, 0)')
            }

            ctx.beginPath()
            ctx.arc(headX, headY, 14, 0, Math.PI * 2)
            ctx.fillStyle = headGradient
            ctx.fill()

            // Bright core
            ctx.beginPath()
            ctx.arc(headX, headY, 4, 0, Math.PI * 2)
            ctx.fillStyle = pulse.color === 'gold' ? 'rgba(255, 255, 200, 1)' : 'rgba(255, 255, 255, 1)'
            ctx.fill()

            // Illuminate origin star
            const originPos = starPositions[pulse.path[0]]
            if (originPos) {
              const originGlow = ctx.createRadialGradient(originPos.x, originPos.y, 0, originPos.x, originPos.y, 18)
              if (pulse.color === 'gold') {
                originGlow.addColorStop(0, 'rgba(251, 191, 36, 0.7)')
                originGlow.addColorStop(1, 'rgba(251, 191, 36, 0)')
              } else {
                originGlow.addColorStop(0, 'rgba(103, 232, 249, 0.8)')
                originGlow.addColorStop(1, 'rgba(0, 212, 255, 0)')
              }
              ctx.beginPath()
              ctx.arc(originPos.x, originPos.y, 18, 0, Math.PI * 2)
              ctx.fillStyle = originGlow
              ctx.fill()
            }
          }
        }
      }

      pulsesRef.current = activePulses
    }

    const animate = (timestamp: number) => {
      // Smooth lerp for responsive movement
      offsetRef.current.x += (targetX - offsetRef.current.x) * 0.08
      offsetRef.current.y += (targetY - offsetRef.current.y) * 0.08

      // Apply different parallax to each layer container
      if (containerRef1.current) {
        const mult = LAYER_MULTIPLIERS[1]
        containerRef1.current.style.transform = `translate(${offsetRef.current.x * mult}px, ${offsetRef.current.y * mult}px)`
      }
      if (containerRef2.current) {
        const mult = LAYER_MULTIPLIERS[2]
        containerRef2.current.style.transform = `translate(${offsetRef.current.x * mult}px, ${offsetRef.current.y * mult}px)`
      }
      if (containerRef3.current) {
        const mult = LAYER_MULTIPLIERS[3]
        containerRef3.current.style.transform = `translate(${offsetRef.current.x * mult}px, ${offsetRef.current.y * mult}px)`
      }

      drawConnectionsAndPulses(timestamp)
      animationFrame = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth
        canvasRef.current.height = window.innerHeight
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })
    handleResize()
    animationFrame = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrame)
    }
  }, [nebulas])

  // Split stars by layer for rendering
  const layer1Stars = stars.filter(s => s.layer === 1)
  const layer2Stars = stars.filter(s => s.layer === 2)
  const layer3Stars = stars.filter(s => s.layer === 3)

  // Get color class for a star
  const getColorClass = (color: StarColor) => {
    switch (color) {
      case 'cyan-light': return 'star-cyan-light'
      case 'cyan-dark': return 'star-cyan-dark'
      case 'gold': return 'star-gold'
    }
  }

  if (!mounted) return null

  return (
    <>
      {/* CSS for star animations with multiple colors */}
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: var(--star-opacity); transform: scale(1); }
          50% { opacity: calc(var(--star-opacity) * 1.5); transform: scale(1.2); }
        }
        .star {
          position: absolute;
          border-radius: 50%;
          animation: twinkle var(--star-duration) ease-in-out infinite;
          animation-delay: var(--star-delay);
          will-change: opacity, transform;
        }
        /* Light cyan - brighter, more vibrant */
        .star-cyan-light {
          background-color: rgb(103, 232, 249);
          box-shadow: 0 0 8px 3px rgba(103, 232, 249, 0.5);
        }
        /* Dark cyan - deeper, more subtle */
        .star-cyan-dark {
          background-color: rgb(34, 211, 238);
          box-shadow: 0 0 6px 2px rgba(0, 180, 216, 0.4);
        }
        /* Gold - tertiary brand color */
        .star-gold {
          background-color: rgb(251, 191, 36);
          box-shadow: 0 0 8px 3px rgba(251, 191, 36, 0.5);
        }
      `}</style>

      {/* Canvas for connecting lines */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[5]"
        style={{ willChange: 'transform' }}
      />

      {/* Layer 1 - Back layer (slowest movement, dimmer stars) */}
      <div
        ref={containerRef1}
        className="fixed inset-0 overflow-hidden pointer-events-none z-[4]"
        style={{ willChange: 'transform' }}
      >
        {layer1Stars.map((star) => (
          <div
            key={star.id}
            className={`star ${getColorClass(star.color)}`}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              '--star-opacity': star.opacity,
              '--star-delay': `${star.delay}s`,
              '--star-duration': `${star.duration}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Layer 2 - Middle layer */}
      <div
        ref={containerRef2}
        className="fixed inset-0 overflow-hidden pointer-events-none z-[5]"
        style={{ willChange: 'transform' }}
      >
        {layer2Stars.map((star) => (
          <div
            key={star.id}
            className={`star ${getColorClass(star.color)}`}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              '--star-opacity': star.opacity,
              '--star-delay': `${star.delay}s`,
              '--star-duration': `${star.duration}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Layer 3 - Front layer (fastest movement, brighter stars) */}
      <div
        ref={containerRef3}
        className="fixed inset-0 overflow-hidden pointer-events-none z-[6]"
        style={{ willChange: 'transform' }}
      >
        {layer3Stars.map((star) => (
          <div
            key={star.id}
            className={`star ${getColorClass(star.color)}`}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              '--star-opacity': star.opacity,
              '--star-delay': `${star.delay}s`,
              '--star-duration': `${star.duration}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  )
}
