const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const backgroundImage = new Image();
backgroundImage.src = 'bg.png';
let backgroundX = 0;

// --- Player properties ---
const player = {
    x: 100,
    y: canvas.height / 2 - 25,
    width: 50,
    height: 50,
    speed: 3.5,
    dx: 0,
    dy: 0,
    sprite: new Image(),
    frameX: 0,
    frameY: 0,
    frameWidth: 341,
    frameHeight: 268,
    facingRight: true,
    animationTimer: 0,
    animationSpeed: 15,
};
player.sprite.src = 'player.png';

let isMovingToNextLevel = false;

const MIN_SAFE_DISTANCE = 100; 

const playerHealth = {
    current: 10000,
    max: 10000,
};

function drawPlayerHealth() {
    ctx.fillStyle = 'black';
    ctx.fillRect(10, 10, 200, 20);
    ctx.fillStyle = 'green';
    ctx.fillRect(10, 10, (playerHealth.current / playerHealth.max) * 200, 20); // Health bar
    ctx.strokeStyle = 'white';
    ctx.strokeRect(10, 10, 200, 20); 
}

const enemyAttackRange = 50;
const enemyAttackCooldown = 1000;

const bullets = [];
const bulletSpeed = 10;
const shootCooldown = 200;
let lastShotTime = 0;

let enemies = initializeEnemies();

function initializeEnemies() {
    return [
        { x: 400, y: 200, width: 50, height: 50, health: 3, dx: 1, dy: 1, lastAttackTime: 0 },
        { x: 600, y: 300, width: 50, height: 50, health: 3, dx: -1, dy: -1, lastAttackTime: 0 },
    ];
}

const keys = {};
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

function drawBackground() {
    let backgroundWidth = canvas.width;
    let backgroundHeight = canvas.height;

    let x = backgroundX % backgroundWidth;
    if (x > 0) x -= backgroundWidth; // Ensure seamless repetition

    while (x < canvas.width) {
        ctx.drawImage(backgroundImage, x, 0, backgroundWidth, backgroundHeight);
        x += backgroundWidth;
    }
}

function drawPlayer() {
  ctx.save();
  if (!player.facingRight) {
      ctx.scale(-1, 1);
      ctx.drawImage(
          player.sprite,
          player.frameX * player.frameWidth, 0, player.frameWidth, player.frameHeight,
          -player.x - player.width, player.y, player.width, player.height
      );
  } else {
      ctx.drawImage(
          player.sprite,
          player.frameX * player.frameWidth, 0, player.frameWidth, player.frameHeight,
          player.x, player.y, player.width, player.height
      );
  }
  ctx.restore();
}

function updatePlayerSprite() {
  player.animationTimer++;
  if (player.animationTimer >= player.animationSpeed) {
      player.animationTimer = 0;
      if (player.dx !== 0 || player.dy !== 0) {
          player.frameX = (player.frameX + 1) % 4;
      } else {
          player.frameX = 0;
      }
  }
}

function triggerLevelChange() {
    enemiesCleared = true;
    backgroundX = 0;  // Reset background position
    currentLevel++;
    enemies = initializeEnemiesForLevel(currentLevel);
    player.x = 0;  // Reset player position to the left side
    enemiesCleared = false;
}

function updatePlayer() {
    if (isMovingToNextLevel) {
        player.dx = player.speed;
        player.facingRight = true;

        player.x += player.dx;
        backgroundX -= player.speed / 2; // Move the background to the left to show progress

        if (player.x + player.width > canvas.width) {
            player.x = canvas.width - player.width;
            triggerLevelChange();  // Trigger level change when reaching the right edge
        }
        
        updatePlayerSprite(); // Animate player sprite during transition
    } else {
        player.dx = 0;
        player.dy = 0;

        if (keys['ArrowUp'] || keys['w']) player.dy = -player.speed;
        if (keys['ArrowDown'] || keys['s']) player.dy = player.speed;
        if (keys['ArrowLeft'] || keys['a']) {
            player.dx = -player.speed;
            player.facingRight = false;
        }
        if (keys['ArrowRight'] || keys['d']) {
            player.dx = player.speed;
            player.facingRight = true;
        }

        player.x += player.dx;
        player.y += player.dy;

        if (player.x < 0) player.x = 0;
        if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
        if (player.y < 0) player.y = 0;
        if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

        updatePlayerSprite();
    }
}

function drawBullets() {
  bullets.forEach(bullet => {
      ctx.fillStyle = 'yellow';
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
}

function shootBullet() {
    const currentTime = Date.now();
    if (currentTime - lastShotTime >= shootCooldown) {
        bullets.push({
            x: player.facingRight ? player.x + player.width : player.x,
            y: player.y + player.height / 2,
            width: 10,
            height: 5,
            speed: player.facingRight ? bulletSpeed : -bulletSpeed,
        });
        lastShotTime = currentTime;
    }
}


function updateBullets() {
  bullets.forEach((bullet, index) => {
      bullet.x += bullet.speed;
      if (bullet.x < 0 || bullet.x > canvas.width) bullets.splice(index, 1);
  });
}

function drawEnemies() {
  enemies.forEach(enemy => {
      ctx.fillStyle = 'red';
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

      ctx.fillStyle = 'black';
      ctx.fillRect(enemy.x, enemy.y - 10, enemy.width, 5);
      ctx.fillStyle = 'green';
      ctx.fillRect(enemy.x, enemy.y - 10, (enemy.health / 3) * enemy.width, 5);
  });
}

function updateEnemies() {
    enemies.forEach((enemy, index) => {
        if (distanceBetween(player.x + player.width / 2, player.y + player.height / 2, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2) > enemyAttackRange) {
            moveTowardPlayer(enemy);
        }

        if (distanceBetween(player.x + player.width / 2, player.y + player.height / 2, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2) <= enemyAttackRange) {
            const currentTime = Date.now();
            if (currentTime - enemy.lastAttackTime >= enemyAttackCooldown) {
                playerHealth.current--;
                enemy.lastAttackTime = currentTime;

                if (playerHealth.current <= 0) {
                    alert("Game Over!");
                    resetGame();
                }
            }
        }

        bullets.forEach((bullet, bulletIndex) => {
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                enemy.health--;
                bullets.splice(bulletIndex, 1);
                if (enemy.health <= 0) enemies.splice(index, 1);
            }
        });
    });

    checkLevelProgression();
}

function moveTowardPlayer(enemy) {
    const angle = Math.atan2(player.y + player.height / 2 - (enemy.y + enemy.height / 2), player.x + player.width / 2 - (enemy.x + enemy.width / 2));
    const speed = 2;
    enemy.x += Math.cos(angle) * speed;
    enemy.y += Math.sin(angle) * speed;

    if (enemy.x < 0) enemy.x = 0;
    if (enemy.x + enemy.width > canvas.width) enemy.x = canvas.width - enemy.width;
    if (enemy.y < 0) enemy.y = 0;
    if (enemy.y + enemy.height > canvas.height) enemy.y = canvas.height - enemy.height;
}

function distanceBetween(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function resetGame() {
    player.x = 100;
    player.y = canvas.height / 2 - 25;
    playerHealth.current = playerHealth.max;
    currentLevel = 1; 
    enemies = initializeEnemiesForLevel(currentLevel);
    bullets.length = 0; 
    backgroundX = 0; 
}

let currentLevel = 1;
let enemiesCleared = false;

function drawLevelInfo() {
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Level: ${currentLevel}`, canvas.width - 100, 30);
}

function initializeEnemiesForLevel(level) {
    const baseEnemyCount = 1; // Base number of enemies
    const maxEnemyCount = 20; // Maximum number of enemies
    const enemyCount = Math.min(baseEnemyCount + level, maxEnemyCount); // Increase enemies based on level

    const baseHealth = 3; // Base health for enemies
    const healthIncrement = Math.floor(level / 2); // Increase health every 2 levels

    const baseSpeed = 1; // Base speed for enemies

    const enemies = [];

    for (let i = 0; i < enemyCount; i++) {
        let spawnX, spawnY;
        let safeDistance = false;

        // Ensure the enemy spawns at a safe distance from the player
        while (!safeDistance) {
            spawnX = Math.random() * (canvas.width - 50);
            spawnY = Math.random() * (canvas.height - 50);
            const distance = distanceBetween(player.x + player.width / 2, player.y + player.height / 2, spawnX + 25, spawnY + 25);

            if (distance >= MIN_SAFE_DISTANCE) {
                safeDistance = true;
            }
        }

        enemies.push({
            x: spawnX,
            y: spawnY,
            width: 50,
            height: 50,
            health: baseHealth + healthIncrement, // Increase healthassssds
            lastAttackTime: 0,
        });
    }

    return enemies;
}

function checkLevelProgression() {
    if (enemies.length === 0 && !enemiesCleared) {
        enemiesCleared = true;
        isMovingToNextLevel = true; // Start moving to the next level
    }
}

function triggerLevelChange() {
    isMovingToNextLevel = false;
    backgroundX = 0;  // Reset background position
    currentLevel++;
    enemies = initializeEnemiesForLevel(currentLevel);
    player.x = 0;  // Reset player position to the left side
    enemiesCleared = false;
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawPlayerHealth();
    drawLevelInfo();

    updatePlayer();
    updateBullets();
    updateEnemies();
    checkLevelProgression();

    requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') shootBullet();
});

enemies = initializeEnemiesForLevel(currentLevel);
gameLoop();