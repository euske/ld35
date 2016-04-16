// game.ts
//   requires: utils.ts
//   requires: geom.ts
//   requires: entity.ts
//   requires: tilemap.ts
//   requires: text.ts
//   requires: layer.ts
//   requires: scene.ts
//   requires: app.ts

enum Tile {
    FLOOR = 1,
    LADDER = 2,
}
function isObstacle(c:number) {
    return (c == Tile.FLOOR);
}
function isStoppable(c:number) {
    return (c == Tile.FLOOR || c == Tile.LADDER);
}
function isGrabbable(c:number) {
    return (c == Tile.LADDER);
}


// ChatBox
class ChatBox extends DialogBox {
    
    screen: Rect;
    border: string = 'white';
    posy: number = 0;

    constructor(screen:Rect, font:Font=null) {
	super(new Rect(8, 8, screen.width-16, 50), font);
	this.screen = screen;
    }
    
    adjustPosition(y: number) {
	if (y < this.posy+this.frame.height+8) {
	    this.posy = this.screen.bottom()-this.frame.height-8;
	} else if (this.posy-8 < y) {
	    this.posy = this.screen.y;
	}
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	by += this.posy;
	super.render(ctx, bx, by);
	if (this.bounds !== null) {
	    bx += this.bounds.x;
	    by += this.bounds.y;
	}
	let rect = this.frame.inflate(5, 5);
	ctx.lineWidth = 2;
	ctx.strokeStyle = this.border;
	ctx.strokeRect(bx+rect.x, by+rect.y, rect.width, rect.height);
    }
}


//  Player
//
class Player extends PhysicalEntity {

    scene: Game;
    usermove: Vec2;

    constructor(scene: Game, pos: Vec2) {
	let bounds = pos.expand(16, 16);
	super(bounds, new DummyImageSource('white'), bounds);
	this.scene = scene;
	this.usermove = new Vec2();
    }

    setMove(v: Vec2) {
	this.usermove = v.scale(4);
    }
    
    update() {
	if (this.usermove.y != 0 &&
	    this.getMove(this.usermove, this.hitbox, true).y == 0) {
	    let tilemap = this.scene.tilemap;
	    let vy = this.hitbox.height * sign(this.usermove.y);
	    if (tilemap.findTile(isGrabbable, this.hitbox.move(16, vy)) !== null) {
		this.movement = new Vec2(4, 0);
	    } else if (tilemap.findTile(isGrabbable, this.hitbox.move(-16, vy)) !== null) {
		this.movement = new Vec2(-4, 0);
	    }
	} else {
	    this.movement = this.usermove;
	}

	super.update();
    }

    isHolding() {
	let tilemap = this.scene.tilemap;
	return (tilemap.findTile(isGrabbable, this.hitbox) !== null);
    }

    getContactFor(v: Vec2, hitbox: Rect, force: boolean, range: Rect): Vec2 {
	let tilemap = this.scene.tilemap;
	let f = (force || this.isHolding())? isObstacle : isStoppable;
	return tilemap.contactTile(hitbox, f, v, range);
    }
  
    getConstraintsFor(hitbox: Rect, force: boolean) {
	return this.scene.screen;
    }
}


//  Game
// 
class Game extends GameScene {

    sheet: SpriteSheet;
    tiles: SpriteSheet;
    
    dialog: ChatBox;
    tilemap: TileMap;
    player: Player;

    constructor(app: App) {
	super(app);
	this.sheet = new ImageSpriteSheet(app.images['sprites'], new Vec2(16,16));
	this.tiles = new DummySpriteSheet(['black','gray','orange','red']);
    }
    
    init() {
	super.init();

	let map:[[number]] = [
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,1,1,0],
	    
	    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0],
	    [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0],
	    [0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,2,0,0,0],
	    [0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,2,0,0,0],
	    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
	];
	this.tilemap = new TileMap(16, map);
	
	this.player = new Player(this, this.screen.center());
	this.addObject(this.player);

	this.dialog = new ChatBox(this.screen, this.app.font);
	this.dialog.linespace = 2;
	this.dialog.padding = 4;
	this.dialog.background = 'black';
	this.dialog.addDisplay('I HAVE NO MEMORY.\nBLAH\nBLAH\nBHAL\nBLAE', 2);
	this.dialog.start(this.layer);
    }

    tick() {
	super.tick();
	this.dialog.adjustPosition(this.player.bounds.y);
	this.dialog.tick();
    }

    set_dir(v: Vec2) {
	super.set_dir(v);
	this.player.setMove(this.app.key_dir);
    }

    set_action(action: boolean) {
	super.set_action(action);
	this.player.setJump(action? Infinity : 0);
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);
	this.layer.renderTilesFromBottomLeft(
	    ctx, bx, by,
	    this.tilemap, this.tiles,
	    (x:number,y:number,c:number) => { return this.tilemap.get(x,y); });
	super.render(ctx, bx, by);
	this.dialog.render(ctx, bx, by);
    }
}
