class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
        this.audioContextCreated = false;
    }

    init() {
        this.ACCELERATION = 400;
        this.DRAG = 500;
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        this.coinCount = 0;
        this.powerUpActive = false;
    }

    create() {
        this.input.once('pointerup', () => {
            if (!this.audioContextCreated) {
                this.sound.context.resume();
                this.audioContextCreated = true;
            }
        });

        this.map = this.add.tilemap("platformer-level-1");
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);
        this.groundLayer.setCollisionByProperty({ collides: true });

        this.loadBackgroundObjects(14);

        this.coins = this.map.createFromObjects("Objects", {name: "coin", key: "tilemap_sheet", frame: 151});
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.coinGroup = this.add.group(this.coins);

        this.keys = this.map.createFromObjects("Object key", {name: 'key', key: 'tilemap_sheet', frame: 27});
        this.physics.world.enable(this.keys, Phaser.Physics.Arcade.STATIC_BODY);
        this.keyGroup = this.add.group(this.keys);

        this.locks = this.map.createFromObjects("Object lock", {name: 'lock', key: 'tilemap_sheet', frame: 28});
        this.physics.world.enable(this.locks, Phaser.Physics.Arcade.STATIC_BODY);
        this.lockGroup = this.add.group(this.locks);

        this.waters = this.map.createFromObjects("Object water", {name: 'water', key: 'tilemap_sheet', frame: 53});
        this.physics.world.enable(this.waters, Phaser.Physics.Arcade.STATIC_BODY);
        this.waterGroup = this.add.group(this.waters);

        my.sprite.player = this.physics.add.sprite(30, 345, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);
        my.sprite.player.hasKey = false;

        this.physics.add.collider(my.sprite.player, this.groundLayer);
        this.physics.add.overlap(my.sprite.player, this.coinGroup, this.collectCoin, null, this);
        this.physics.add.overlap(my.sprite.player, this.keyGroup, this.collectKey, null, this);
        this.physics.add.overlap(my.sprite.player, this.lockGroup, this.unlockLock, null, this);
        this.physics.add.overlap(my.sprite.player, this.waterGroup, this.restartLevel, null, this);

        cursors = this.input.keyboard.createCursorKeys();
        this.rKey = this.input.keyboard.addKey('R');
        this.rKey.on('down', () => this.scene.restart());
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25);
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
        
        // Particle effects for movement
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['circle_01.png', 'circle_02.png', 'circle_03.png'],
            // TODO: Try: add random: true
            random: true,
            scale: {start: 0.005, end: 0.015},
            // TODO: Try: maxAliveParticles: 8,
            lifespan: 350,
            maxAliveParticles: 8,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
            gravityY: -400,
        });

        my.vfx.walking.stop();


        this.coinText = this.add.text(10, 10, 'Coins: 0', { fontSize: '20px', fill: '#ffffff' }).setScrollFactor(0).setDepth(100);
        this.powerUpText = this.add.text(10, 35, '', { fontSize: '20px', fill: '#ff0000' }).setScrollFactor(0);
    }

    collectCoin(player, coin) {
        coin.destroy();
        this.coinCount++;
        this.coinText.setText(`Coins: ${this.coinCount}`);
        if (this.coinCount >= 15 && !this.powerUpActive) {
            this.activatePowerUp();
        }
    }

    collectKey(player, key) {
        key.destroy();
        player.hasKey = true;
    }

    unlockLock(player, lock) {
        if (player.hasKey) {
            lock.destroy();
            this.displayLevelComplete();
        }
    }

    restartLevel(player, water) {
        this.scene.restart();
    }

    loadBackgroundObjects(offsetX) {
        const backgroundLayer = this.map.getObjectLayer('Objects background');
        if (!backgroundLayer) {
            console.error("Background layer not found!");
            return;
        }
        backgroundLayer.objects.forEach(obj => {
            this.add.sprite(obj.x + offsetX, obj.y, 'tilemap_sheet', obj.gid - 1).setOrigin(1);
        });
    }

    update() {
        this.handlePlayerMovement();
        this.handleJumping();
    }

    handlePlayerMovement() {
        if (cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
        } else if (cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlipX(true);
            my.sprite.player.anims.play('walk', true);
        } else {
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
        }
        this.manageParticleEffects();
    }

    handleJumping() {
        if (cursors.up.isDown && my.sprite.player.body.blocked.down) {
            my.sprite.player.setVelocityY(this.JUMP_VELOCITY);
        }
    }
    manageParticleEffects() {
        if (my.sprite.player.body.speed > 0) {
            my.vfx.walking.startFollow(my.sprite.player);
        } else {
            my.vfx.walking.stop();
        }
    }

    activatePowerUp() {
        this.powerUpActive = true;
        my.sprite.player.JUMP_VELOCITY = -900; // Increase jump velocity for the power-up
        this.powerUpText.setText('Power Up Active!'); // Show power-up activation text
        this.time.delayedCall(10000, () => this.deactivatePowerUp(), [], this);
    }

    deactivatePowerUp() {
        my.sprite.player.JUMP_VELOCITY = -600; // Reset jump velocity to normal
        this.powerUpActive = false;
        this.powerUpText.setText(''); // Clear the power-up text
    }

    displayLevelComplete() {
        let completeText = this.add.text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, 'Level Complete!', { fontSize: '32px', fill: '#ffffff' });
        completeText.setOrigin(0.5);
        this.time.delayedCall(2000, () => completeText.destroy());
    }
}
