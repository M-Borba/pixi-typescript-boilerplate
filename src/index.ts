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
let robotPipeSprite: PIXI.Sprite;
let scoreText: PIXI.Text;
let timeout: NodeJS.Timeout;
let interval: NodeJS.Timeout;

const winningPoints = 1;
const score = { player: 0, robot: 0 };
const bird: { vector: { x: number; y: number }; sprite: PIXI.AnimatedSprite | any } = {
    sprite: undefined,
    vector: { x: 1, y: Math.random() - 0.4 },
};

//Robot bounds
const playerPipeBottomBound = () => playerPipeSprite.position.y + playerPipeSprite.height / 2;
const playerPipeTopBound = () => playerPipeSprite.position.y - playerPipeSprite.height / 2;
const playerPipeVerticalBound = () => playerPipeSprite.position.x - playerPipeSprite.width;
//Player bounds
const robotPipeTopBound = () => robotPipeSprite.position.y - robotPipeSprite.height / 2;
const robotPipeBottomBound = () => robotPipeSprite.position.y + robotPipeSprite.height / 2;
const robotPipeVerticalBound = () => robotPipeSprite.position.x + robotPipeSprite.width;
const playerScore = (b: { sprite: PIXI.Sprite }) => b.sprite.position.x > gameWidth;
const robotScore = (b: { sprite: PIXI.Sprite }) => b.sprite.position.x < 0;

const robotVelocity = 4;
const birdVelocity = 10;

timeout = setTimeout(() => console.log("timeout defined"), 1);
let gamemode = 0;
type birdObject = {
    vector: { x: number; y: number };
    sprite: PIXI.AnimatedSprite;
};
const birds: birdObject[] = [];

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
    backgroundSprite.zIndex = -1;
    bird.sprite = getBird();
    playerPipeSprite = getPipe();
    playerPipeSprite.zIndex = -1;
    robotPipeSprite = getPipe();
    robotPipeSprite.zIndex = -1;
    scoreText = new PIXI.Text(`${score.player}  -  ${score.robot}`, textStyle);

    backgroundSprite.anchor.set(0.5, 0.5);
    scoreText.anchor.set(0.5, 0.5);

    playerPipeSprite.anchor.set(0.5, 0.5);
    robotPipeSprite.anchor.set(0.5, 0.5);

    const borderSpace = (3 * playerPipeSprite.width) / 5;
    backgroundSprite.position.set(gameWidth / 2, gameHeight / 2);
    scoreText.position.set(gameWidth / 2, gameHeight / 4);

    playerPipeSprite.position.set(borderSpace, gameHeight / 2);
    robotPipeSprite.position.set(gameWidth - borderSpace, gameHeight / 2);

    stage.sortableChildren = true;
    stage.position.x = 0;
    stage.position.y = 0;
    stage.interactive = true;
    stage.addChild(backgroundSprite);
    stage.addChild(scoreText);
    stage.addChild(bird.sprite);
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
        if (bird.sprite.position.y > gameHeight || bird.sprite.position.y < 0) bounceBirdY(bird);
        if (playerHit(bird)) bounceBirdX(bird);
        if (robotHit(bird)) bounceBirdX(bird);

        // Check if someone scored
        if (playerScore(bird)) {
            score.player += 1;
            if (score.player < winningPoints) {
                scoreText.text = `You scored !`;
                bird.sprite.scale.x *= -1;
                dropBird(bird);
                clearTimeout(timeout);
                timeout = setTimeout(() => (scoreText.text = `${score.player}  -  ${score.robot}`), 1000);
            } else {
                gamemode = 1;
                scoreText.text = `You won ! Endless level reached !`;
                //apply filter
                stage.removeChild(bird.sprite);
                delete bird.sprite;
                // we spawn one bird every 3 seconds
                clearTimeout(timeout);
                interval = setInterval(() => {
                    const b = { sprite: getBird(), vector: { x: 1, y: Math.random() - 0.4 } };
                    birds.push(b);
                    dropBird(birds[birds.length - 1]);
                    stage.addChild(birds[birds.length - 1].sprite);
                }, 3000);
            }
        } else if (robotScore(bird)) {
            score.robot += 1;
            if (score.robot < winningPoints) {
                scoreText.text = `Bot scored !`;
                dropBird(bird);
                clearTimeout(timeout);
                timeout = setTimeout(() => (scoreText.text = `${score.player}  -  ${score.robot}`), 1000);
            } else {
                scoreText.text = `You lose :'( `;
                gamemode = -1;
                stage.removeChild(bird.sprite);
                delete bird.sprite;
            }
        }
    } else if (gamemode == 1) {
        // extra gamemode
        robotPipeSprite.position.set(gameWidth, gameHeight / 2);
        robotPipeSprite.scale.y = gameHeight;
        birds.forEach((b) => {
            updateBirdPosition(b);
            // Top & Bottom bounce
            if (b.sprite.position.y > gameHeight || b.sprite.position.y < 0) bounceBirdY(b);
            if (playerHit(b)) bounceBirdX(b);
            if (robotHit(b)) bounceBirdX(b);
            if (robotScore(b)) {
                scoreText.text = `GG you managed to mantain ${birds.length} birds flying at the same time !`;
                clearInterval(interval);
                birds.forEach((rmBird) => {
                    stage.removeChild(rmBird.sprite);
                });
            }
        });
    }
}
function updateBirdPosition(b: { sprite: PIXI.Sprite; vector: { x: number; y: number } }) {
    b.sprite.position.x += birdVelocity * b.vector.x;
    b.sprite.position.y += birdVelocity * b.vector.y;
}
// sends bird out flying
function dropBird(b: { sprite: PIXI.Sprite; vector: { x: number; y: number } }) {
    b.sprite.position.set(gameWidth * 0.8, gameHeight / 2);
    let yMagnitude = Math.random() - 0.4;
    // its boring if bird has little or no Y velocity
    if (Math.abs(yMagnitude) < 0.2) yMagnitude += Math.sign(yMagnitude) * (yMagnitude + 0.3);
    b.vector = { x: -1, y: yMagnitude };
}
const playerHit = (b: { sprite: PIXI.Sprite; vector: { x: number; y: number } }) =>
    b.sprite.position.y > robotPipeTopBound() &&
    b.sprite.position.y < robotPipeBottomBound() &&
    b.sprite.position.x + (3 * b.sprite.width) / 4 > robotPipeVerticalBound();

const robotHit = (b: { sprite: PIXI.Sprite; vector: { x: number; y: number } }) =>
    b.sprite.position.y > playerPipeTopBound() &&
    b.sprite.position.y < playerPipeBottomBound() &&
    b.sprite.position.x - (3 * b.sprite.width) / 4 < playerPipeVerticalBound();

function bounceBirdX(b: { sprite: PIXI.Sprite; vector: { x: number; y: number } }) {
    b.vector.x = -b.vector.x;
    b.sprite.scale.x *= -1;
    b.sprite.position.x -= 0.5;
}
// a slightly higher probability to increase speed in y axis after a top or bottom bounce
// (0.5 would be equal chance to increase or decrease speed)
function bounceBirdY(b: { sprite: PIXI.Sprite; vector: { x: number; y: number } }) {
    b.vector.y = -b.vector.y * (1 + (Math.random() - 0.35));
    // the mean is not 0 so the series tends to infinity, we have to control it
    if (Math.abs(b.vector.y) > 0.8) b.vector.y = b.vector.y - Math.sign(b.vector.y) * Math.random();
    // lets also set some minimum Y velocity
    if (Math.abs(b.vector.y) < 0.2) b.vector.y = 0.2 + (Math.sign(b.vector.y) * Math.random()) / 4;
}

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
    bird.scale.x *= -1;
    bird.anchor.set(0.5, 0.5);
    bird.position.set(gameWidth * 0.8, gameHeight / 2);

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
