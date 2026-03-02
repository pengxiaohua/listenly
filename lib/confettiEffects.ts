import confetti from 'canvas-confetti'

export type ConfettiEffectType = 'none' | 'realistic' | 'stars'

export const EFFECT_OPTIONS: { value: ConfettiEffectType; label: string }[] = [
  { value: 'none', label: '无' },
  { value: 'realistic', label: '🎊' },
  { value: 'stars', label: '✨' },
]

function fireRealistic() {
  const count = 150
  const defaults = { origin: { y: 0.55 }, ticks: 30, decay: 0.88 }

  function fire(ratio: number, opts: confetti.Options) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * ratio) })
  }

  fire(0.25, { spread: 26, startVelocity: 55 })
  fire(0.2, { spread: 60 })
  fire(0.35, { spread: 100, scalar: 0.8 })
  fire(0.1, { spread: 120, startVelocity: 25, scalar: 1.2 })
  fire(0.1, { spread: 120, startVelocity: 45 })
}

function fireStars() {
  const defaults = {
    spread: 360,
    ticks: 30,
    gravity: 0,
    decay: 0.88,
    startVelocity: 30,
    colors: ['FFE400', 'FFBD00', 'E89400', 'FFCA6C', 'FDFFB8'],
  }

  function shoot() {
    confetti({ ...defaults, particleCount: 40, scalar: 1.2, shapes: ['star'] })
    confetti({ ...defaults, particleCount: 10, scalar: 0.75, shapes: ['circle'] })
  }

  shoot()
  setTimeout(shoot, 80)
  setTimeout(shoot, 160)
}

const EFFECT_MAP: Record<ConfettiEffectType, () => void> = {
  none: () => {},
  realistic: fireRealistic,
  stars: fireStars,
}

export function playConfettiEffect(type: ConfettiEffectType) {
  if (type === 'none') return
  const fn = EFFECT_MAP[type]
  if (fn) fn()
}
