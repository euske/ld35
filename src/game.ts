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
    NONE = 0,
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


//  ChatBox
// 
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


//  Item
//
class Item extends Entity {

}


//  Bullet
//
class Bullet extends Projectile {
    constructor(frame: Rect, p: Vec2, v: Vec2) {
	let bounds = p.expand(4, 2);
	super(frame,
	      bounds, new DummyImageSource('white'),
	      bounds, v.scale(8));
    }
}


//  Actor
//
class Actor extends PhysicalEntity {

    scene: Game;
    direction: Vec2;
    shape: number;

    constructor(scene: Game, bounds: Rect, shape: number=0) {
	super(bounds, null, bounds.inflate(-1, -1));
	this.scene = scene;
	this.direction = new Vec2(1,0);
	this.setShape(shape);
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

    setShape(shape: number) {
	if (this.shape != shape) {
	    this.shape = shape;
	    this.src = this.scene.sheet.get(1+shape);
	}
    }
    
    fire() {
	let obj = new Bullet(
	    this.scene.layer.window,
	    this.bounds.center(), this.direction);
	this.scene.addObject(obj);
    }
}


//  Player
//
class Player extends Actor {

    usermove: Vec2;

    private _collide0: Entity;
    private _collide1: Entity;

    constructor(scene: Game, pos: Vec2) {
	let bounds = pos.expand(16, 16);
	super(scene, bounds, 3);
	this.usermove = new Vec2();
	this._collide0 = null;
	this._collide1 = null;
    }

    setMove(v: Vec2) {
	this.usermove = v.scale(4);
	if (v.x != 0) {
	    this.direction.x = sign(v.x);
	}
    }

    collide(entity: Entity) {
	if (entity instanceof Item) {
	    this._collide1 = entity;
	}
    }

    change() {
	this.setShape((this.shape+1) % 3);
    }
    
    update() {
	super.update();
	let movement = this.usermove;
	if (this.usermove.y != 0 &&
	    this.getMove(this.usermove, this.hitbox, true).y == 0) {
	    let tilemap = this.scene.tilemap;
	    let vy = this.hitbox.height * sign(this.usermove.y);
	    if (tilemap.findTile(isGrabbable, this.hitbox.move(16, vy)) !== null) {
		movement = new Vec2(4, 0);
	    } else if (tilemap.findTile(isGrabbable, this.hitbox.move(-16, vy)) !== null) {
		movement = new Vec2(-4, 0);
	    }
	}
	this.moveIfPossible(movement, true);
	if (this._collide1 !== null &&
	    this._collide0 === null) {
	    this.change();
	}
	this._collide0 = this._collide1;
	this._collide1 = null;
    }
}


//  Countryman
//
class Countryman extends Actor {
    constructor(scene: Game, bounds: Rect, shape: number) {
	super(scene, bounds, shape);
    }

    update() {
	super.update();
	let v = new Vec2(rnd(3)-1, rnd(3)-1);
	this.moveIfPossible(v, true);
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
	this.tiles = new DummySpriteSheet(['black','gray','orange','white']);
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
	    [0,0,0,1,0,1,10,0,0,0,0,0,0,0,0,0,2,0,0,0],
	    [0,0,1,0,0,0,1,0,0,0,0,0,0,20,0,0,2,0,0,0],
	    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
	];
	this.tilemap = new TileMap(16, map);
	this.tilemap.apply(
	    (x: number, y: number, c: number) => {
		switch (c) {
		case 10:
		    {
			let bounds = this.tilemap.map2coord(new Vec2(x, y));
			let obj = new Item(bounds, this.tiles.get(3), bounds);
			this.addObject(obj);
		    }
		    break;
		case 20:
		    {
			let bounds = this.tilemap.map2coord(new Vec2(x, y));
			let obj = new Countryman(this, bounds, c-20);
			this.addObject(obj);
		    }
		    break;
		}
		return false;
	    });
	
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

    keydown(keycode:number) {
	let keysym = getKeySym(keycode);
	switch (keysym) {
	case 'cancel':
	    this.player.fire();
	    break;
	}
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
	function ft(x: number, y: number, c: number) {
	    return (c < 10)? c : Tile.NONE;
	}
	this.layer.renderTilesFromBottomLeft(
	    ctx, bx, by,
	    this.tilemap, this.tiles, ft);
	super.render(ctx, bx, by);
	this.dialog.render(ctx, bx, by);
    }
}
