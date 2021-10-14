import * as PIXI from "pixi.js";
import "./style.css";

declare const VERSION: string;

const gameWidth = window.innerWidth * 0.9;
const gameHeight = window.innerHeight * 0.9;

console.log(`Welcome from pixi-typescript-boilerplate ${VERSION}`);

const app = new PIXI.Application({
    backgroundColor: 0xd3d3d3,
    width: gameWidth,
    height: gameHeight,
});

const stage = app.stage;
let playerPipeSprite: PIXI.Sprite;
const scoreToWin = 5;

let robotPipeSprite: PIXI.Sprite;
let scoreText: PIXI.Text;
const score = { player: 0, robot: 0 };

const playerPipeBottomBound = () => playerPipeSprite.position.y + playerPipeSprite.height / 2;
const playerPipeTopBound = () => playerPipeSprite.position.y - playerPipeSprite.height / 2;
const playerPipeLeftBound = () => playerPipeSprite.position.x + playerPipeSprite.width / 2;

const robotPipeTopBound = () => robotPipeSprite.position.y - robotPipeSprite.height / 2;
const robotPipeBottomBound = () => robotPipeSprite.position.y + robotPipeSprite.height / 2;
const robotPipeRightBound = () => robotPipeSprite.position.x - robotPipeSprite.width / 2;

const robotVelocity = 4;
const birdVelocity = 10;
let timeout: NodeJS.Timeout;
timeout = setTimeout(() => console.log("timeout defined"), 1);
let gamemode = 0;
const bird: { vector: { x: number; y: number }; sprite: PIXI.AnimatedSprite | any } = {
    sprite: undefined,
    vector: { x: 1, y: Math.random() - 0.4 },
};

window.onload = async (): Promise<void> => {
    await loadGameAssets();

    document.body.appendChild(app.view);
    resizeCanvas();
    app.ticker.add(() => gameLoop());
    console.log("assets loaded and ticker running");
};

async function loadGameAssets(): Promise<void> {
    return new Promise((res, rej) => {
        const loader = PIXI.Loader.shared;
        loader.add("rabbit", "./assets/simpleSpriteSheet.json");

        loader.onComplete.once(() => {
            res();
        });
        loader.onError.once(() => {
            console.log("error loading assets");
            rej();
        });
        loader.load(setup);
    });
}

function setup(): void {
    const textStyle = new PIXI.TextStyle({
        fontFamily: "Monaco",
        fill: "green",
    });
    const backgroundSprite = getBackground();
    bird.sprite = getBird();
    playerPipeSprite = getPipe();
    robotPipeSprite = getPipe();
    scoreText = new PIXI.Text(`${score.player}  -  ${score.robot}`, textStyle);

    backgroundSprite.anchor.set(0.5, 0.5);
    scoreText.anchor.set(0.5, 0.5);
    bird.sprite.anchor.set(0.5, 0.5);
    playerPipeSprite.anchor.set(0.5, 0.5);
    robotPipeSprite.anchor.set(0.5, 0.5);

    const borderSpace = playerPipeSprite.width;
    backgroundSprite.position.set(gameWidth / 2, gameHeight / 2);
    scoreText.position.set(gameWidth / 2, gameHeight / 4);
    bird.sprite.position.set(gameWidth / 2, gameHeight / 2);
    playerPipeSprite.position.set(borderSpace, gameHeight / 2);
    robotPipeSprite.position.set(gameWidth - 2 * borderSpace, gameHeight / 2);

    stage.position.x = 0;
    stage.position.y = 0;
    stage.interactive = true;
    stage.addChild(backgroundSprite);
    stage.addChild(scoreText);
    stage.addChild(bird.sprite);
    bird.sprite.scale.x *= -1;
    dropBird(bird);
    stage.addChild(playerPipeSprite);
    stage.addChild(robotPipeSprite);
    stage.on("pointermove", movePlayerPipe);
}

// --- PRINCIPAL GAME LOOP ---
function gameLoop(): void {
    if (gamemode == 0) {
        // Update Robot position to follow bird
        const yDistance = robotPipeSprite.position.y - bird.sprite.position.y;
        if (yDistance > 0) robotPipeSprite.position.y -= robotVelocity;
        else robotPipeSprite.position.y += robotVelocity;

        updateBirdPosition(bird);
        // Top & Bottom bounce
        if (bird.sprite.position.y > gameHeight || bird.sprite.position.y < 0) bounceBirdY();
        // Robot pipe bounce
        if (
            bird.sprite.position.y > robotPipeTopBound() &&
            bird.sprite.position.y < robotPipeBottomBound() &&
            bird.sprite.position.x + bird.sprite.width / 2 > robotPipeRightBound()
        )
            bounceBirdX();
        // Player pipe bounce
        if (
            bird.sprite.position.y > playerPipeTopBound() &&
            bird.sprite.position.y < playerPipeBottomBound() &&
            bird.sprite.position.x - bird.sprite.width / 2 < playerPipeLeftBound()
        )
            bounceBirdX();

        // Check if someone scored
        if (bird.sprite.position.x > gameWidth) {
            score.player += 1;
            if (score.player < scoreToWin) {
                scoreText.text = `You scored !`;
                bird.sprite.scale.x *= -1;
                dropBird(bird);
            } else {
                gamemode = 1;
                scoreText.text = `You won ! Endless level reached !`;
                stage.removeChild(bird.sprite);
            }
        } else if (bird.sprite.position.x < 0) {
            score.robot += 1;
            if (score.robot < scoreToWin) {
                scoreText.text = `Bot scored !`;
                dropBird(bird);
            } else {
                scoreText.text = `You lose :'( `; // TODO:Endless level reached !
                stage.removeChild(bird.sprite);
            }
        }
    } else {
        console.log("todo endless level");
    }
}
const updateBirdPosition = (b: { sprite: PIXI.Sprite; vector: { x: number; y: number } }) => {
    b.sprite.position.x += birdVelocity * b.vector.x;
    b.sprite.position.y += birdVelocity * b.vector.y;
};
// sends bird out flying and updates score after a timeout
const dropBird = (b: { sprite: PIXI.Sprite; vector: { x: number; y: number } }) => {
    clearTimeout(timeout);
    b.sprite.position.set(gameWidth * 0.8, gameHeight / 2);
    timeout = setTimeout(() => (scoreText.text = `${score.player}  -  ${score.robot}`), 1000);
    let yMagnitude = Math.random() - 0.4;
    // its boring if bird has little or no Y velocity
    if (Math.abs(yMagnitude) < 0.2) yMagnitude += Math.sign(yMagnitude) * (yMagnitude + 0.2);
    b.vector = { x: -1, y: yMagnitude };
};

const bounceBirdX = () => {
    bird.vector.x = -bird.vector.x;
    bird.sprite.scale.x *= -1;
    bird.sprite.position.x -= 0.5;
};
// a slightly higher probability to increase speed in y axis after a top or bottom bounce
// (0.5 would be equal chance to increase or decrease speed)
const bounceBirdY = () => (bird.vector.y = -bird.vector.y * (1 + (Math.random() - 0.35)));

function resizeCanvas(): void {
    const resize = () => {
        app.renderer.resize(gameWidth, gameHeight);
        console.log(gameWidth, gameHeight);
    };
    resize();
    window.addEventListener("resize", resize);
}

function movePlayerPipe(e: { data: { global: { y: number; x: number } } }) {
    const pointer = e.data.global.y;
    if (pointer - playerPipeSprite.height / 2 > 0 && pointer + playerPipeSprite.height / 2 < gameHeight)
        playerPipeSprite.position.y = pointer;
}

function getBird(): PIXI.AnimatedSprite {
    const bird = new PIXI.AnimatedSprite([
        PIXI.Texture.from("birdUp.png"),
        PIXI.Texture.from("birdMiddle.png"),
        PIXI.Texture.from("birdDown.png"),
    ]);

    bird.loop = true;
    bird.animationSpeed = 0.2;
    bird.play();
    bird.scale.set(3);

    return bird;
}

function getPipe(): PIXI.Sprite {
    const playerPipe = new PIXI.Sprite(PIXI.Texture.from("pipe.png"));
    return playerPipe;
}

function getBackground(): PIXI.TilingSprite {
    const background = new PIXI.Sprite(PIXI.Texture.from("background.png"));
    const tiling = new PIXI.TilingSprite(background.texture, 500, 250);
    tiling.scale.set(4, 4);
    return tiling;
}
