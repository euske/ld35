// game.ts
//   requires: utils.ts
//   requires: geom.ts
//   requires: entity.ts
//   requires: tilemap.ts
//   requires: text.ts
//   requires: layer.ts
//   requires: scene.ts
//   requires: app.ts
//   requires: levels.ts

function isObstacle(c:number) {
    return (c == Tile.FLOOR);
}
function isStoppable(c:number) {
    return (c == Tile.FLOOR || c == Tile.LADDER);
}
function isGrabbable(c:number) {
    return (c == Tile.LADDER);
}
PlatformerEntity.isObstacle = isObstacle;
PlatformerEntity.isGrabbable = isGrabbable;
PlatformerEntity.isStoppable = isStoppable;


//  ChatBox
// 
class ChatBox extends DialogBox {
    
    bounds1: Rect;
    bounds2: Rect;
    border: string;

    constructor(screen:Rect, font:Font=null) {
	let bounds1 = screen.anchor(0,1).expand(screen.width, 56, 0,1);
	super(bounds1.inflate(-8,-8), font);
	this.bounds1 = bounds1;
	this.bounds2 = screen.anchor(0,-1).expand(screen.width, 56, 0,-1);
	this.bounds = this.bounds1;
	this.border = 'white';
	this.autohide = true;
    }
    
    adjustPosition(rect: Rect) {
	rect = rect.inflate(16, 16);
	if (rect.overlap(this.bounds1)) {
	    this.bounds = this.bounds2;
	} else if (rect.overlap(this.bounds2)) {
	    this.bounds = this.bounds1;
	}
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
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
class Actor extends PlatformerEntity {

    scene: Game;
    direction: Vec2;
    shape: number;

    constructor(scene: Game, bounds: Rect, shape=0) {
	super(scene.tilemap, bounds, null, bounds.inflate(-1, -1));
	this.zorder = 1;
	this.scene = scene;
	this.direction = new Vec2(1,0);
	this.setShape(shape);
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

    constructor(scene: Game, bounds: Rect) {
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
	this.moveSmart(this.usermove);
	if (this._collide1 !== null &&
	    this._collide0 === null) {
	    this.change();
	}
	this._collide0 = this._collide1;
	this._collide1 = null;
    }
    
    moveSmart(v: Vec2) {
	v = v.copy();
	if (v.y != 0) {
	    if (v.y < 0 && !this.isHolding()) {
		v.y = 0;
	    } else if (this.getMove(v, this.hitbox, true).y == 0) {
		let tilemap = this.scene.tilemap;
		let dy = this.hitbox.height * sign(v.y);
		if (tilemap.findTile(isGrabbable,
				     this.hitbox.move(16, dy)) !== null) {
		    v = new Vec2(4, 0);
		} else if (tilemap.findTile(isGrabbable,
					    this.hitbox.move(-16, dy)) !== null) {
		    v = new Vec2(-4, 0);
		}
	    }
	}
	this.moveIfPossible(v, true);
    }	
}


//  Countryman
//
class Countryman extends PlanningEntity {

    scene: Game;
    shape: number;
    
    constructor(scene: Game, bounds: Rect, shape: number) {
	let gridsize = scene.tilemap.tilesize;
	super(scene.tilemap, gridsize, bounds, null, bounds.inflate(-1, -1));
	this.zorder = 1;
	this.scene = scene;
	this.shape = shape;
	this.src = this.scene.sheet.get(1+shape);
    }

    getConstraintsFor(hitbox: Rect, force: boolean) {
	return this.scene.screen;
    }

    update() {
	super.update();
	if (!this.isPlanRunning()) {
	    this.makePlan(this.scene.player.hitbox.center());
	}
	this.move();
    }
}


//  Game
// 
class Game extends GameScene {

    sheet: SpriteSheet;
    tiles: SpriteSheet;
    curlevel: number;
    
    dialog: ChatBox;
    tilemap: TileMap;
    player: Player;

    constructor(app: App) {
	super(app);
	this.sheet = new ImageSpriteSheet(app.images['sprites'], new Vec2(16,16));
	this.tiles = new DummySpriteSheet(['black','gray','orange','white']);
	this.curlevel = 0;
    }
    
    init() {
	super.init();

	let level = LEVELS[this.curlevel];
	this.tilemap = new TileMap(16, level.getArray());
	PlanningEntity.initializeMap(this.tilemap);
	
	this.player = null;
	this.tilemap.apply(
	    (x: number, y: number, c: number) => {
		let bounds = this.tilemap.map2coord(new Vec2(x, y));
		switch (c) {
		case Tile.PLAYER:
		    this.player = new Player(this, bounds);
		    this.addObject(this.player);
		    break;
		case Tile.ITEM:
		    this.addObject(new Item(bounds, this.tiles.get(3), bounds));
		    break;
		case Tile.SHAPE1:
		case Tile.SHAPE2:
		case Tile.SHAPE3:
		    this.addObject(new Countryman(this, bounds, c-20));
		    break;
		}
		return false;
	    });
	
	this.dialog = new ChatBox(this.screen, this.app.font);
	this.dialog.linespace = 2;
	this.dialog.padding = 4;
	this.dialog.background = 'black';
	this.dialog.addDisplay(level.text, 2);
	this.dialog.addPause(30);
	this.dialog.start(this.layer);
    }

    tick() {
	super.tick();
	this.layer.setCenter(this.tilemap.world, this.player.bounds.inflate(64,64));
	this.dialog.adjustPosition(this.player.bounds);
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
	if (this.dialog.visible) {
	    this.dialog.render(ctx, bx, by);
	}
    }
}
