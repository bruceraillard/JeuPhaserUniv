// Phaser game configuration
var config = {
    type: Phaser.AUTO,
    width: 700,
    height: 640,
    parent: "jeu",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: { preload, create, update }
};

var game = new Phaser.Game(config);

// Game variables
var platforms, player, stars, bombs, cursors, door, ground;
var score = 0, gameOver = false, timer = 90;
var scoreText, timerText;

// Platforms list
var platformList = [
    { x: 200, y:150, t:'platform', sx: 1, sy: 1},
    { x: 500, y: 450, t: 'platform', sx: 1, sy: 1 },
    { x: 800, y: 300, t: 'platform', sx: 1, sy: 1 },
    { x: 300, y: 280, t: 'platform', sx: 1, sy: 1 },
    { x: 550, y: 150, t: 'platform', sx: 1, sy: 1 },
    { x: 1100, y: 100, t: 'platform', sx: 1, sy: 1 }
];

// Preload assets
function preload() {
    this.load.image('sky', 'assets/sky.jpg');
    this.load.image('platform', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('bomb', 'assets/bomb.png');
    this.load.image('door', 'assets/door.png');
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
}

// Create game objects
function create() {
    // Background setup
    this.add.image(640, 320, 'sky').setScale(1, 1);
    this.cameras.main.setBounds(0, 0, 1280, 640);
    this.physics.world.setBounds(0, 0, 1280, 640);

    // Ground setup (custom drawn texture)
    let groundGraphics = this.add.graphics();
    groundGraphics.fillStyle(0x8B4513, 1); // Brown color
    groundGraphics.fillRect(0, 0, 1280, 10);
    groundGraphics.generateTexture('groundTexture', 1280, 10);
    groundGraphics.destroy();

    // Create the ground using the generated texture
    ground = this.physics.add.staticImage(640, 635, 'groundTexture');

    // Platforms setup
    platforms = this.physics.add.staticGroup();
    platforms.create(640, 608, 'platform').refreshBody();
    platformList.forEach(p => platforms.create(p.x, p.y, p.t).refreshBody());

    // Player setup
    player = this.physics.add.sprite(100, 450, 'dude');
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);

    // Player animations
    this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'turn', frames: [{ key: 'dude', frame: 4 }], frameRate: 20 });
    this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });

    // Collisions
    this.physics.add.collider(player, ground);
    this.physics.add.collider(player, platforms);

    // Stars setup
    stars = this.physics.add.group({ key: 'star', repeat: 22, setXY: { x: 12, y: 0, stepX: 70 } });
    stars.children.iterate((child, index) => {
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));
        let row = Math.floor(index / 12);
        child.x = 100 + (index % 12) * 70;
        child.y = 100 + row * 100;
    });
    this.physics.add.collider(stars, platforms);
    this.physics.add.collider(stars, ground);
    this.physics.add.overlap(player, stars, collectStar, null, this);

    // Bombs setup
    bombs = this.physics.add.group();
    this.physics.add.collider(player, bombs, hitBomb, null, this);
    this.physics.add.collider(platforms, bombs);
    this.physics.add.collider(ground, bombs);

    // Input setup
    cursors = this.input.keyboard.createCursorKeys();

    // UI setup
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff' });
    timerText = this.add.text(1050, 16, 'Time: 90s', { fontSize: '32px', fill: '#fff' });
    this.time.addEvent({ delay: 1000, callback: updateTimer, callbackScope: this, loop: true });
    this.cameras.main.startFollow(player, true, 0.05, 0.05);
}

// Game update loop
function update() {
    if (gameOver) return;

    player.setVelocityX(0);
    if (cursors.left.isDown) {
        player.setVelocityX(-160);
        player.anims.play('left', true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(160);
        player.anims.play('right', true);
    } else {
        player.anims.play('turn');
    }

    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-330);
    }
}

// Collect star function
function collectStar(player, star) {
    star.disableBody(true, true);
    score++;
    scoreText.setText('Score: ' + score);

    if (score % 3 === 0) {
        var x = Phaser.Math.Between(800, 1800);
        var bomb = bombs.create(x, 16, 'bomb');
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
        bomb.allowGravity = false;
    }

    if (stars.countActive(true) === 0 && !door) {
        door = this.physics.add.image(1050, 200, 'door');
        door.body.allowGravity = false;
        door.body.immovable = true;
        this.physics.add.overlap(player, door, reachDoor, null, this);
    }
}

// Player hit by bomb function
function hitBomb(player, bomb) {
    this.physics.pause();
    player.setTint(0xFF0000);
    player.anims.play('turn');
    this.add.text(500, 300, 'GAME OVER!', { fontSize: '50px', fill: '#fff' });
    gameOver = true;
}

// Timer update function
function updateTimer() {
    if (timer > 0) {
        timer--;
        timerText.setText('Time: ' + timer + 's');
    } else {
        player.setActive(false).setVisible(false);
        this.add.text(500, 300, 'TIME UP!', { fontSize: '50px', fill: '#fff' });
        gameOver = true;
    }
}

// Player reaches door function
function reachDoor(player, door) {
    this.add.text(500, 300, 'CHAMPION!', { fontSize: '50px', fill: '#fff' });
    gameOver = true;
}
