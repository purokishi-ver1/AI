/**
 * AI Procedural Shooting Game
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Procedural Sprite Generator
function generateSprite(width, height, type = 'enemy') {
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = width;
    spriteCanvas.height = height;
    const sCtx = spriteCanvas.getContext('2d');

    const halfWidth = Math.ceil(width / 2);
    const pixelSize = type === 'boss' ? 8 : 4;

    let color;
    switch(type) {
        case 'player': color = '#0ff'; break;
        case 'enemy': color = `hsl(${Math.random() * 360}, 70%, 50%)`; break;
        case 'boss': color = '#f0f'; break;
        case 'powerup': color = '#ff0'; break;
        default: color = '#fff';
    }

    sCtx.fillStyle = color;

    // Generate symmetric pattern
    for (let x = 0; x < halfWidth; x += pixelSize) {
        for (let y = 0; y < height; y += pixelSize) {
            if (Math.random() > 0.4) {
                // Main side
                sCtx.fillRect(x, y, pixelSize, pixelSize);
                // Symmetric side
                sCtx.fillRect(width - x - pixelSize, y, pixelSize, pixelSize);
            }
        }
    }

    // Add some highlights/outline
    sCtx.strokeStyle = '#fff';
    sCtx.lineWidth = 1;
    sCtx.strokeRect(0, 0, width, height);

    return spriteCanvas;
}

// Game State
const state = {
    running: false,
    gameOver: false,
    score: 0,
    lives: 3,
    time: 0,
    keys: {},
    player: {
        x: 50,
        y: canvas.height / 2,
        width: 32,
        height: 32,
        speed: 5,
        sprite: generateSprite(32, 32, 'player'),
        options: [],
        shield: 0,
        laser: false,
        speedLevel: 0,
        fireCooldown: 0,
        fireRate: 15,
        posHistory: [],
        invincible: 0
    },
    enemies: [],
    bullets: [],
    enemyBullets: [],
    particles: [],
    powerups: [],
    boss: null,
    level: 1,
    bgStars: []
};

// Initialize background stars
for (let i = 0; i < 100; i++) {
    state.bgStars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: Math.random() * 3 + 1
    });
}

// Input Handling
window.addEventListener('keydown', (e) => {
    state.keys[e.code] = true;
    if (e.code === 'Space') {
        if (!state.running && !state.gameOver) {
            state.running = true;
            document.getElementById('menu').classList.add('hidden');
        } else if (state.gameOver) {
            location.reload();
        }
    }
});
window.addEventListener('keyup', (e) => {
    state.keys[e.code] = false;
});

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        state.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 40,
            color
        });
    }
}

function endGame(win = false) {
    state.gameOver = true;
    const goMenu = document.getElementById('game-over');
    goMenu.classList.remove('hidden');
    goMenu.querySelector('h1').innerText = win ? 'MISSION ACCOMPLISHED' : 'GAME OVER';
    document.getElementById('final-score').innerText = `Score: ${state.score}`;
}

function spawnPowerup(x, y) {
    const types = ['speed', 'option', 'laser', 'shield'];
    const type = types[Math.floor(Math.random() * types.length)];
    state.powerups.push({
        x, y,
        width: 20,
        height: 20,
        type,
        sprite: generateSprite(20, 20, 'powerup')
    });
}

function applyPowerup(type) {
    state.score += 500;
    switch(type) {
        case 'speed':
            state.player.speedLevel = Math.min(state.player.speedLevel + 1, 5);
            break;
        case 'shield':
            state.player.shield = Math.min(state.player.shield + 1, 3);
            break;
        case 'option':
            if (state.player.options.length < 4) {
                state.player.options.push({
                    sprite: generateSprite(16, 16, 'player')
                });
            }
            break;
        case 'laser':
            state.player.laser = true;
            setTimeout(() => { state.player.laser = false; }, 5000);
            break;
    }
}

function playerHit() {
    if (state.player.invincible > 0) return;

    if (state.player.shield > 0) {
        state.player.shield--;
        state.player.invincible = 60;
        return;
    }

    state.lives--;
    createExplosion(state.player.x, state.player.y, '#0ff');
    if (state.lives <= 0) {
        endGame();
    } else {
        state.player.x = 50;
        state.player.y = canvas.height / 2;
        state.player.invincible = 120;
    }
}

function spawnEnemy() {
    const type = Math.random() > 0.7 ? 'advanced' : 'basic';
    const size = 32;
    state.enemies.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - size),
        width: size,
        height: size,
        speed: type === 'basic' ? 3 : 5,
        sprite: generateSprite(size, size, 'enemy'),
        pattern: type === 'basic' ? 'linear' : 'sine',
        health: type === 'basic' ? 1 : 3
    });
}

function spawnBoss() {
    const size = 128;
    state.boss = {
        x: canvas.width + 100,
        y: canvas.height / 2 - size / 2,
        width: size,
        height: size,
        health: 200,
        maxHealth: 200,
        sprite: generateSprite(size, size, 'boss'),
        time: 0
    };
}

function update() {
    if (!state.running || state.gameOver) return;

    state.time++;
    if (state.player.invincible > 0) state.player.invincible--;

    // Update Particles
    state.particles = state.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
    });

    // Background stars movement
    state.bgStars.forEach(star => {
        star.x -= star.speed;
        if (star.x < 0) star.x = canvas.width;
    });

    // Player Movement
    let speed = state.player.speed + (state.player.speedLevel * 2);
    if (state.keys['KeyW'] || state.keys['ArrowUp']) state.player.y -= speed;
    if (state.keys['KeyS'] || state.keys['ArrowDown']) state.player.y += speed;
    if (state.keys['KeyA'] || state.keys['ArrowLeft']) state.player.x -= speed;
    if (state.keys['KeyD'] || state.keys['ArrowRight']) state.player.x += speed;

    // Boundaries
    if (state.player.x < 0) state.player.x = 0;
    if (state.player.y < 0) state.player.y = 0;
    if (state.player.x > canvas.width - state.player.width) state.player.x = canvas.width - state.player.width;
    if (state.player.y > canvas.height - state.player.height) state.player.y = canvas.height - state.player.height;

    // Track position history for options
    state.player.posHistory.unshift({x: state.player.x, y: state.player.y});
    if (state.player.posHistory.length > 100) state.player.posHistory.pop();

    // Player Firing (Autofire)
    if (state.player.fireCooldown > 0) state.player.fireCooldown--;
    if (state.player.fireCooldown === 0) {
        const fire = (x, y) => {
            state.bullets.push({
                x: x + 32,
                y: y + 14,
                width: 10,
                height: 4,
                speed: 10,
                color: '#0ff'
            });
        };
        fire(state.player.x, state.player.y);
        state.player.options.forEach((opt, i) => {
            const histPos = state.player.posHistory[(i + 1) * 10] || state.player;
            fire(histPos.x, histPos.y + 8);
        });
        state.player.fireCooldown = state.player.fireRate;
    }

    // Laser damage logic
    if (state.player.laser) {
        const checkLaserDamage = (x, y) => {
            state.enemies.forEach(enemy => {
                if (enemy.y < y + 20 && enemy.y + enemy.height > y + 12 && enemy.x > x) {
                    enemy.health -= 0.1;
                }
            });
            if (state.boss) {
                if (state.boss.y < y + 20 && state.boss.y + state.boss.height > y + 12 && state.boss.x > x) {
                    state.boss.health -= 0.1;
                }
            }
        };
        checkLaserDamage(state.player.x, state.player.y);
        state.player.options.forEach((opt, i) => {
            const histPos = state.player.posHistory[(i + 1) * 10] || state.player;
            checkLaserDamage(histPos.x, histPos.y + 8);
        });
    }

    // Update Bullets
    state.bullets = state.bullets.filter(bullet => {
        bullet.x += bullet.speed;
        return bullet.x < canvas.width;
    });

    // Update Powerups
    state.powerups = state.powerups.filter(p => {
        p.x -= 2;
        if (checkCollision(state.player, p)) {
            applyPowerup(p.type);
            return false;
        }
        return p.x + p.width > 0;
    });

    // Spawn Enemies
    if (state.time % 60 === 0 && !state.boss && state.score < 5000) {
        spawnEnemy();
    }

    // Boss Trigger
    if (state.score >= 5000 && !state.boss && state.level === 1) {
        spawnBoss();
        state.level = 2;
    }

    // Update Boss
    if (state.boss) {
        state.boss.time++;
        state.boss.y += Math.sin(state.boss.time / 50) * 2;
        if (state.boss.x > 600) state.boss.x -= 1;

        // Boss Shooting
        if (state.boss.time % 40 === 0) {
            state.enemyBullets.push({
                x: state.boss.x,
                y: state.boss.y + Math.random() * state.boss.height,
                vx: -5,
                vy: (Math.random() - 0.5) * 4,
                width: 12,
                height: 12,
                color: '#f0f'
            });
        }

        // Bullet vs Boss
        state.bullets = state.bullets.filter(bullet => {
            if (checkCollision(bullet, state.boss)) {
                state.boss.health--;
                return false;
            }
            return true;
        });

        if (state.boss.health <= 0) {
            createExplosion(state.boss.x + state.boss.width/2, state.boss.y + state.boss.height/2, '#f0f');
            state.score += 10000;
            state.boss = null;
            endGame(true);
        }
    }

    // Update Enemy Bullets
    state.enemyBullets = state.enemyBullets.filter(eb => {
        eb.x += eb.vx;
        eb.y += eb.vy;
        if (checkCollision(eb, state.player)) {
            playerHit();
            return false;
        }
        return eb.x + eb.width > 0;
    });

    // Update Enemies & Collision
    state.enemies = state.enemies.filter(enemy => {
        enemy.x -= enemy.speed;
        if (enemy.pattern === 'sine') {
            enemy.y += Math.sin(state.time / 20) * 3;
        }

        // Bullet vs Enemy
        state.bullets = state.bullets.filter(bullet => {
            if (checkCollision(bullet, enemy)) {
                enemy.health--;
                return false;
            }
            return true;
        });

        // Player vs Enemy
        if (checkCollision(state.player, enemy)) {
            playerHit();
            enemy.health = 0; // Destroy enemy on impact
        }

        if (enemy.health <= 0) {
            createExplosion(enemy.x, enemy.y, '#f00');
            state.score += 100;
            if (Math.random() > 0.8) spawnPowerup(enemy.x, enemy.y);
            return false;
        }

        return enemy.x + enemy.width > 0;
    });
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stars
    state.bgStars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.size / 2})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // Draw Player
    if (state.player && (state.player.invincible % 4 < 2)) {
        if (state.player.shield > 0) {
            ctx.strokeStyle = '#0ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(state.player.x + 16, state.player.y + 16, 24, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.drawImage(state.player.sprite, state.player.x, state.player.y);

        // Draw Options
        state.player.options.forEach((opt, i) => {
            const histPos = state.player.posHistory[(i + 1) * 10] || state.player;
            ctx.drawImage(opt.sprite, histPos.x, histPos.y + 8);
        });

        // Draw Laser
        if (state.player.laser) {
            const drawLaserLine = (x, y) => {
                ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
                ctx.fillRect(x + 32, y + 12, canvas.width, 8);
            };
            drawLaserLine(state.player.x, state.player.y);
            state.player.options.forEach((opt, i) => {
                const histPos = state.player.posHistory[(i + 1) * 10] || state.player;
                drawLaserLine(histPos.x, histPos.y + 8);
            });
        }
    }

    // Draw Bullets
    ctx.fillStyle = '#0ff';
    state.bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    // Draw Enemies
    state.enemies.forEach(enemy => {
        ctx.drawImage(enemy.sprite, enemy.x, enemy.y);
    });

    // Draw Boss
    if (state.boss) {
        ctx.drawImage(state.boss.sprite, state.boss.x, state.boss.y);
        // Health bar
        ctx.fillStyle = '#444';
        ctx.fillRect(state.boss.x, state.boss.y - 20, state.boss.width, 10);
        ctx.fillStyle = '#f0f';
        ctx.fillRect(state.boss.x, state.boss.y - 20, (state.boss.health / state.boss.maxHealth) * state.boss.width, 10);
    }

    // Draw Enemy Bullets
    state.enemyBullets.forEach(eb => {
        ctx.fillStyle = eb.color;
        ctx.fillRect(eb.x, eb.y, eb.width, eb.height);
    });

    // Draw Powerups
    state.powerups.forEach(p => {
        ctx.drawImage(p.sprite, p.x, p.y);
    });

    // Draw Particles
    state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 40;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1;
    });

    // Update UI
    document.getElementById('score').innerText = `Score: ${state.score}`;
    document.getElementById('lives').innerText = `Lives: ${state.lives}`;

    // Powerup Indicators
    document.getElementById('p-speed').className = state.player.speedLevel > 0 ? 'active' : '';
    document.getElementById('p-option').className = state.player.options.length > 0 ? 'active' : '';
    document.getElementById('p-laser').className = state.player.laser ? 'active' : '';
    document.getElementById('p-shield').className = state.player.shield > 0 ? 'active' : '';
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
