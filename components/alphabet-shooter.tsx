'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const PLAYER_SIZE = 30
const BULLET_SIZE = 5
const PLAYER_SPEED = 5
const ENEMY_SPEED = 1
const BULLET_SPEED = 10
const SPECIAL_ATTACK_COOLDOWN = 5000 // 5秒のクールダウン

interface Position {
  x: number
  y: number
}

interface Enemy extends Position {
  letter: string
  size: number
}

interface Bullet extends Position {
  dx: number
  dy: number
}

export function AlphabetShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [player, setPlayer] = useState<Position>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 })
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [keys, setKeys] = useState<Set<string>>(new Set())
  const [lastSpecialAttack, setLastSpecialAttack] = useState(0)
  const [specialAttackActive, setSpecialAttackActive] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => setKeys(prev => new Set(prev).add(e.key))
    const handleKeyUp = (e: KeyboardEvent) => setKeys(prev => {
      const newKeys = new Set(prev)
      newKeys.delete(e.key)
      return newKeys
    })

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const performSpecialAttack = () => {
    const now = Date.now()
    if (now - lastSpecialAttack >= SPECIAL_ATTACK_COOLDOWN) {
      setLastSpecialAttack(now)
      setSpecialAttackActive(true)
      setTimeout(() => setSpecialAttackActive(false), 1000) // 1秒間特殊攻撃の効果を表示
      
      // 全ての敵を倒す
      setEnemies([])
      setScore(prev => prev + enemies.length)
    }
  }

  useEffect(() => {
    if (gameOver) return

    const gameLoop = setInterval(() => {
      // Move player
      setPlayer(prev => {
        let newX = prev.x
        let newY = prev.y
        if (keys.has('a')) newX -= PLAYER_SPEED
        if (keys.has('d')) newX += PLAYER_SPEED
        if (keys.has('w')) newY -= PLAYER_SPEED
        if (keys.has('s')) newY += PLAYER_SPEED
        return {
          x: Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_SIZE, newX)),
          y: Math.max(0, Math.min(CANVAS_HEIGHT - PLAYER_SIZE, newY))
        }
      })

      // Move bullets
      setBullets(prev => prev.map(bullet => ({
        ...bullet,
        x: bullet.x + bullet.dx,
        y: bullet.y + bullet.dy
      })).filter(bullet => 
        bullet.x > 0 && bullet.x < CANVAS_WIDTH &&
        bullet.y > 0 && bullet.y < CANVAS_HEIGHT
      ))

      // Move enemies
      setEnemies(prev => {
        const newEnemies = prev.map(enemy => ({
          ...enemy,
          x: enemy.x + (Math.random() - 0.5) * ENEMY_SPEED,
          y: enemy.y + (Math.random() - 0.5) * ENEMY_SPEED
        })).filter(enemy => 
          enemy.x >= 0 && enemy.x <= CANVAS_WIDTH - enemy.size &&
          enemy.y >= 0 && enemy.y <= CANVAS_HEIGHT - enemy.size
        )

        if (Math.random() < 0.02 && newEnemies.length < 10) {
          newEnemies.push({
            x: Math.random() * (CANVAS_WIDTH - PLAYER_SIZE),
            y: Math.random() * (CANVAS_HEIGHT - PLAYER_SIZE),
            letter: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
            size: Math.floor(Math.random() * 20) + 20 // Random size between 20 and 40
          })
        }

        return newEnemies
      })

      // Check collisions
      setEnemies(prevEnemies => {
        const newEnemies = prevEnemies.filter(enemy => {
          const hitByBullet = bullets.some(bullet =>
            bullet.x < enemy.x + enemy.size &&
            bullet.x + BULLET_SIZE > enemy.x &&
            bullet.y < enemy.y + enemy.size &&
            bullet.y + BULLET_SIZE > enemy.y
          )

          if (hitByBullet) {
            setScore(prev => prev + 1)
            return false
          }
          return true
        })

        if (newEnemies.some(enemy =>
          enemy.x < player.x + PLAYER_SIZE &&
          enemy.x + enemy.size > player.x &&
          enemy.y < player.y + PLAYER_SIZE &&
          enemy.y + enemy.size > player.y
        )) {
          setGameOver(true)
          clearInterval(gameLoop)
        }

        return newEnemies
      })

      // Shoot bullets
      const directions = [
        keys.has('ArrowUp'),
        keys.has('ArrowRight'),
        keys.has('ArrowDown'),
        keys.has('ArrowLeft')
      ]
      if (directions.some(dir => dir)) {
        const dx = (directions[1] ? 1 : 0) - (directions[3] ? 1 : 0)
        const dy = (directions[2] ? 1 : 0) - (directions[0] ? 1 : 0)
        const length = Math.sqrt(dx * dx + dy * dy)
        setBullets(prev => [...prev, {
          x: player.x + PLAYER_SIZE / 2,
          y: player.y + PLAYER_SIZE / 2,
          dx: dx / length * BULLET_SPEED,
          dy: dy / length * BULLET_SPEED
        }])
      }

      // Special attack
      if (keys.has(' ')) {
        performSpecialAttack()
      }
    }, 1000 / 60)

    return () => clearInterval(gameLoop)
  }, [gameOver, player, enemies, bullets, keys, lastSpecialAttack])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')

    if (ctx) {
      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      gradient.addColorStop(0, 'rgba(255, 182, 193, 0.2)')  // Light pink
      gradient.addColorStop(1, 'rgba(173, 216, 230, 0.2)')  // Light blue

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Draw player
      ctx.fillStyle = 'rgba(0, 0, 255, 0.7)'
      ctx.font = `${PLAYER_SIZE}px Sevillana, cursive`
      ctx.fillText('Z', player.x, player.y + PLAYER_SIZE)

      // Draw enemies
      enemies.forEach(enemy => {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)'
        ctx.font = `${enemy.size}px Sevillana, cursive`
        ctx.fillText(enemy.letter, enemy.x, enemy.y + enemy.size)
      })

      // Draw bullets
      ctx.fillStyle = 'rgba(0, 255, 0, 0.7)'
      bullets.forEach(bullet => {
        ctx.beginPath()
        ctx.arc(bullet.x, bullet.y, BULLET_SIZE / 2, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw special attack effect
      if (specialAttackActive) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      }
    }
  }, [player, enemies, bullets, specialAttackActive])

  const restartGame = () => {
    setPlayer({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 })
    setEnemies([])
    setBullets([])
    setScore(0)
    setGameOver(false)
    setLastSpecialAttack(0)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-pink-200 to-blue-200">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sevillana&display=swap');
      `}</style>
      <h1 className="text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 font-['Sevillana']">Alphabet Shooter</h1>
      <div className="mb-4 text-2xl font-['Sevillana']">Score: {score}</div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-4 border-white rounded-lg shadow-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        />
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <h2 className="text-4xl font-bold mb-4 text-white font-['Sevillana']">Game Over!</h2>
            <Button onClick={restartGame} className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition duration-300 ease-in-out transform hover:scale-105">
              Restart Game
            </Button>
          </div>
        )}
      </div>
      <div className="mt-4 text-lg font-['Sevillana'] text-center">
        <p>Use WASD keys to move 'Z'</p>
        <p>Use arrow keys to shoot in 8 directions</p>
        <p>Shoot other letters to defeat them</p>
        <p>Press SPACE for a special attack (5 second cooldown)</p>
      </div>
    </div>
  )
}
