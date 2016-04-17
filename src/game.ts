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
    return (c == Tile.FLOOR1 || c == Tile.FLOOR2 || c == Tile.DOOR);
}
function isStoppable(c:number) {
    return (c == Tile.FLOOR1 || c == Tile.FLOOR2 || c == Tile.DOOR || c == Tile.LADDER);
}
function isGrabbable(c:number) {
    return (c == Tile.LADDER);
}
PlatformerEntity.isObstacle = isObstacle;
PlatformerEntity.isGrabbable = isGrabbable;
PlatformerEntity.isStoppable = isStoppable;
PlanningEntity.debug = true;


//  ChatBox
// 
class ChatBox extends DialogBox {
    
    bounds1: Rect;
    bounds2: Rect;
    border: string;

    constructor(screen:Rect, font:Font=null) {
	super(new Rect(8, 16, screen.width-16, 50), font);
	this.bounds1 = new Rect(0, 8, screen.width, 56);
	this.bounds2 = new Rect(0, screen.height-80, screen.width, 56);
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


//  TextParticle
//
class TextParticle extends TextBox {

    scene: Game;
    movement: Vec2;
    
    constructor(scene: Game, pos: Vec2, text: string,
		movement: Vec2=null, duration=30) {
	super(new Rect(0,0), scene.app.font);
	let size = this.font.getSize(text);
	this.bounds = new Rect(pos.x-size.x/2, pos.y-size.y/2);
	this.movement = movement;
	this.duration = duration;
	this.addSegment(new Vec2(), text);
    }

    update() {
	super.update();
	if (this.movement !== null) {
	    this.movePos(this.movement);
	}
    }
}


//  Changer
//
class Changer extends Entity {
    constructor(bounds: Rect, src: ImageSource) {
	super(bounds.expand(4, 4, 1,-1), src, bounds);
    }
}


//  Door
//
class Door extends Entity {
    
    tilemap: TileMap;
    pos: Vec2;
    
    constructor(tilemap: TileMap, pos: Vec2, bounds: Rect) {
	super(bounds, null, bounds);
	this.tilemap = tilemap;
	this.pos = pos;
	this.tilemap.set(this.pos.x, this.pos.y, Tile.DOOR);
    }

    open() {
	this.tilemap.set(this.pos.x, this.pos.y, Tile.NONE);
    }
}


//  Switch
//
class Switch extends Entity {

    scene: Game;
    src0: ImageSource;
    src1: ImageSource;
    door: Door;
    
    constructor(scene: Game, bounds: Rect, src0: ImageSource, src1: ImageSource) {
	super(bounds.expand(4, 4, 1,-1), null, bounds);
	this.scene = scene;
	this.src0 = src0;
	this.src1 = src1;
	this.door = null;
	this.updateState();
    }

    updateState() {
	this.src = (this.door !== null)? this.src1 : this.src0;
    }

    toggle() {
	if (this.door === null) {
	    // find the closest door.
	    this.scene.layer.findObjects(
		this.scene.tilemap.world,
		(e:Entity) => {
		    if (e instanceof Door) {
			if (this.door === null ||
			    (e.bounds.distance(this.bounds).norm2() <
			     this.door.bounds.distance(this.bounds).norm2())) {
			    this.door = e as Door;
			}
		    }
		    return false;
		}
	    )
	    if (this.door !== null) {
		this.door.open();
		playSound(this.scene.app.audios['door']);
		this.updateState();
	    }
	}
    }
}


//  Exit
//
class Exit extends Entity {
    constructor(bounds: Rect, src: ImageSource) {
	super(bounds.expand(4, 4, 1,-1), src, bounds);
    }
}


//  Bullet
//
class Bullet extends Projectile {

    shape: number;
    tilemap: TileMap;
    
    constructor(shape: number, tilemap: TileMap, p: Vec2, v: Vec2) {
	let bounds = p.expand(4, 2);
	super(tilemap.world,
	      bounds, new DummyImageSource('white'),
	      bounds.expand(4, 0), v.scale(8));
	this.shape = shape;
	this.tilemap = tilemap;
    }
    
    update() {
	super.update();
	if (this.tilemap.findTile(isObstacle, this.hitbox) !== null) {
	    this.die();
	}
    }
}


//  Actor
// 
interface Actor {
    getShape(): number;
}


//  Player
//
class Player extends PlatformerEntity implements Actor {

    scene: Game;
    shadow: ImageSource;
    direction: Vec2;
    shape: number;
    usermove: Vec2;
    
    health: number;
    invuln: number;

    private _collide0: Entity;
    private _collide1: Entity;

    constructor(scene: Game, bounds: Rect,
		shape=-1, health=3) {
	super(scene.tilemap, bounds, null, bounds.inflate(-1, 0));
	this.jumpfunc = (
	    (vy:number, t:number) => { return (0 <= t && t <= 7)? -4 : vy+1; }
	);
	this.zorder = 2;
	this.scene = scene;
	this.shadow = scene.sheet.get(1);
	this.usermove = new Vec2();
	this.direction = new Vec2(1,0);
	this.setShape(shape);
	this.health = health;
	this.invuln = 0;
	this._collide0 = null;
	this._collide1 = null;
    }

    getConstraintsFor(hitbox: Rect, force: boolean) {
	return this.tilemap.world;
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	if (this.isLanded()) {
	    let rect = (this.shadow as HTMLImageSource).bounds;
	    drawImageScaled(ctx, (this.shadow as HTMLImageSource).image,
			    rect.x, rect.y, rect.width, rect.height,
			    bx+this.bounds.x, by+this.bounds.y,
			    this.bounds.width, this.bounds.height);
	}
	super.render(ctx, bx, by);
    }
    
    getShape() {
	return this.shape;
    }

    setShape(shape: number) {
	if (this.shape != shape) {
	    this.shape = shape;
	    this.src = this.scene.sheet.get(3+shape);
	}
    }
    
    collide(entity: Entity) {
	if (entity instanceof Exit) {
	    this.scene.exitLevel();
	} else if (entity instanceof Switch) {
	    (entity as Switch).toggle();
	} else if (entity instanceof Changer) {
	    this._collide1 = entity;
	} else if (entity instanceof Bullet) {
	    if (this.shape != (entity as Bullet).shape) {
		this.hurt();
	    }
	}
    }

    update() {
	super.update();
	this.moveSmart(this.usermove);
	if (this._collide1 !== null &&
	    this._collide0 === null) {
	    this.change();
	}
	this.visible = (this.invuln < this.ticks || blink(this.ticks, 10));
	this._collide0 = this._collide1;
	this._collide1 = null;
    }
    
    setMove(v: Vec2) {
	this.usermove = v.scale(4);
	if (v.x != 0) {
	    this.direction.x = sign(v.x);
	}
    }

    change() {
	this.setShape((this.shape+1) % 3);
	playSound(this.scene.app.audios['change']);
    }
    
    jump() {
	playSound(this.scene.app.audios['jump']);
    }

    hurt() {
	if (this.ticks < this.invuln) return;
	this.health--;
	this.invuln = this.ticks+15;
	this.scene.updateHealth();
	playSound(this.scene.app.audios['hurt']);
	if (this.health === 0) {
	    this.die();
	    this.scene.repeatLevel();
	}
    }
    
    moveSmart(v: Vec2) {
	v = v.copy();
	if (v.y != 0) {
	    let tilemap = this.scene.tilemap;
	    if (v.y < 0 && !this.isHolding()) {
		if (tilemap.findTile(isGrabbable, this.hitbox.add(v)) === null) {
		    v.y = 0;
		}
	    } else if (this.getMove(v, this.hitbox, true).y == 0) {
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


//  Fellow
//
class Fellow extends PlanningEntity implements Actor {

    scene: Game;
    shadow: ImageSource;
    shape: number;

    health: number;
    invuln: number;
    target: Entity;
    greeted: boolean;
    
    private _prevfire: number;
    private _enemies: [Entity];
    
    constructor(scene: Game, bounds: Rect, shape: number, health=3) {
	super(scene.tilemap, bounds, null, bounds.inflate(-1, 0));
	this.zorder = 1;
	this.scene = scene;
	this.shadow = scene.sheet.get(1);
	this.shape = shape;
	this.src = this.scene.sheet.get(3+shape);
	
	this.health = health;
	this.invuln = 0;
	this.target = null;
	this.greeted = false;
	this._prevfire = 0;
	this._enemies = [] as [Entity];
    }

    getConstraintsFor(hitbox: Rect, force: boolean) {
	return this.tilemap.world;
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	if (this.isLanded()) {
	    let rect = (this.shadow as HTMLImageSource).bounds;
	    drawImageScaled(ctx, (this.shadow as HTMLImageSource).image,
			    rect.x, rect.y, rect.width, rect.height,
			    bx+this.bounds.x, by+this.bounds.y,
			    this.bounds.width, this.bounds.height);
	}
	super.render(ctx, bx, by);
    }
    
    getShape() {
	return this.shape;
    }
    
    observe(entity: Entity) {
	let shape: number;
	if (entity instanceof Fellow ||
	    entity instanceof Player) {
	    shape = (entity as Actor).getShape();
	} else {
	    return;
	}

	if (this.target === null) {
	    if (shape == this.shape) {
		if (entity instanceof Player && !this.greeted) {
		    if (!this.isPlanRunning()) {
			if (this.makePlan(entity.hitbox.center())) {
			    this.shout('YO.');
			    this.greeted = true;
			}
		    }
		}
	    } else {
		this._enemies.push(entity);
	    }
	}
    }
    
    collide(entity: Entity) {
	if (entity instanceof Bullet) {
	    if (this.shape != (entity as Bullet).shape) {
		this.hurt();
	    }
	}
    }

    update() {
	super.update();
	this.visible = (this.invuln < this.ticks || blink(this.ticks, 10));
	if (this.target instanceof Fellow ||
	    this.target instanceof Player) {
	    let shape = (this.target as Player).getShape();
	    if (!this.target.alive || this.shape == shape) {
		this.target = null;
	    }
	}
	if (this.target !== null) {
	    let hitbox = this.target.hitbox;
	    if (this.isPointBlank(hitbox)) {
		this.stopPlan();
		let vx = sign(hitbox.x - this.hitbox.x);
		if (hitbox.xdistance(this.hitbox) < 64) {
		    this.movement = new Vec2(-vx*4, 0);
		} else {
		    this.movement = new Vec2(vx*4, 0);
		}
		if (vx != 0) {
		    this.fire(vx);
		}
	    } else {
		if (!this.isPlanRunning()) {
		    if (!this.makePlan(hitbox.center())) {
			// give up.
			this.target = null;
		    }
		}
	    }
	} else {
	    if (0 < this._enemies.length) {
		let target = this._enemies[rnd(this._enemies.length)];
		if (!this.isPlanRunning()) {
		    if (this.makePlan(target.hitbox.center())) {
			this.target = target;
			this.shout('!');
		    }
		}
	    }
	}
	this.move();
	this._enemies = [] as [Entity];
    }

    fire(vx: number) {
	if (this.ticks-this._prevfire < 30) return;
	let obj = new Bullet(
	    this.shape, this.tilemap,
	    this.bounds.center(), new Vec2(vx, 0));
	this._prevfire = this.ticks;
	this.scene.addObject(obj);
	playSound(this.scene.app.audios['shoot']);
    }

    shout(text: string) {
	let particle = new TextParticle(
	    this.scene, this.bounds.anchor(0,1), text, new Vec2(0,-1));
	this.scene.addObject(particle);
	playSound(this.scene.app.audios['notice']);
    }
    
    hurt() {
	if (this.ticks < this.invuln) return;
	this.health--;
	this.invuln = this.ticks+15;
	if (this.health === 0) {
	    this.die();
	    let particle = new Sprite(this.bounds, this.scene.sheet.get(6));
	    particle.zorder = 7;
	    particle.duration = 30;
	    this.scene.addObject(particle);
	}
    }

    isPointBlank(hitbox: Rect) {
	if (hitbox.ydistance(this.hitbox) < 0) {
	    let range = hitbox.union(this.hitbox);
	    return (this.tilemap.findTile(isStoppable, range) === null);
	}
	return false;
    }
}


//  Boss
// 
class Boss extends PlatformerEntity {
    scene: Game;
    
    constructor(scene: Game, bounds: Rect) {
	super(scene.tilemap, bounds, null, bounds);
	this.zorder = 1;
	this.scene = scene;
    }
    
    update() {
	super.update();
	this.src = this.scene.sheet.get(3+rnd(4));
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
    healthStatus: TextBox;

    constructor(app: App) {
	super(app);
	this.sheet = new ImageSpriteSheet(app.images['sprites'], new Vec2(16,16));
	this.tiles = new ImageSpriteSheet(app.images['tiles'], new Vec2(20,20));
	this.healthStatus = new TextBox(new Rect(4,4,64,16), app.colorfont);
	this.healthStatus.zorder = 9;
	this.curlevel = 2;
    }
    
    init() {
	super.init();

	let level = LEVELS[this.curlevel];
	this.tilemap = new TileMap(16, level.getArray());
	PlanningEntity.initialize(this.tilemap.tilesize);
	
	this.player = null;
	this.tilemap.apply(
	    (x: number, y: number, c: number) => {
		let p = new Vec2(x, y);
		let bounds = this.tilemap.map2coord(p);
		switch (c) {
		case Tile.PLAYER:
		    this.player = new Player(this, bounds);
		    this.addObject(this.player);
		    break;
		case Tile.CHANGERENT:
		    this.addObject(new Changer(bounds, this.tiles.get(Tile.CHANGER)));
		    break;
		case Tile.DOORENT:
		    this.addObject(new Door(this.tilemap, p, bounds));
		    break;
		case Tile.EXITENT:
		    this.addObject(new Exit(bounds, this.tiles.get(Tile.EXIT)));
		    break;
		case Tile.SWITCHENT:
		    this.addObject(new Switch(this, bounds,
					      this.tiles.get(Tile.SWITCHOFF),
					      this.tiles.get(Tile.SWITCHON)));
		    break;
		case Tile.SHAPE1:
		case Tile.SHAPE2:
		case Tile.SHAPE3:
		    this.addObject(new Fellow(this, bounds, c-Tile.SHAPE1));
		    break;
		}
		return false;
	    });

	//this.addObject(new Boss(this, this.tilemap.map2coord(new Rect(2,2,8,8))));
	
	this.dialog = new ChatBox(this.screen, this.app.font);
	this.dialog.zorder = 8;
	this.dialog.linespace = 2;
	this.dialog.padding = 4;
	this.dialog.background = 'black';
	this.dialog.addDisplay(level.text, 2);
	this.dialog.addPause(30);
	this.dialog.start(this.layer);

	this.updateHealth();
	this.app.lockKeys();
    }

    tick() {
	super.tick();
	this.scanObjects();
	this.layer.setCenter(this.tilemap.world, this.player.bounds.inflate(128,64));
	this.dialog.adjustPosition(this.player.bounds);
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
	function ft(x: number, y: number, c: number) {
	    return (c < 10)? c : Tile.NONE;
	}
	this.layer.renderTilesFromBottomLeft(
	    ctx, bx, by,
	    this.tilemap, this.tiles, ft);
	super.render(ctx, bx, by);
	
	this.healthStatus.render(ctx, bx, by);
	if (this.dialog.visible) {
	    this.dialog.render(ctx, bx, by);
	}
    }

    scanObjects() {
	let objs = this.layer.entities;
	for (let i = 0; i < objs.length; i++) {
	    let obj0 = objs[i];
	    if (obj0.alive && obj0.hitbox !== null) {
		let visbox0 = obj0.getVisBox();
		for (let j = i+1; j < objs.length; j++) {
		    let obj1 = objs[j];
		    if (obj1 !== obj0 && obj1.alive && obj1.hitbox !== null &&
			obj1.getVisBox().overlap(visbox0)) {
			obj0.observe(obj1);
			obj1.observe(obj0);
		    }
		}
	    }
	}
    }

    exitLevel() {
	this.curlevel++;
	this.init();
	playSound(this.app.audios['exit']);
    }

    repeatLevel() {
	let particle = new Sprite(this.player.bounds, this.sheet.get(6));
	particle.zorder = 7;
	particle.duration = 30;
	particle.died.subscribe(() => {
	    this.init();
	});
	this.addObject(particle);
    }

    updateHealth() {
	let s = '';
	for (let i = 0; i < this.player.health; i++) {
	    s += '\x7f';
	}
	this.healthStatus.clear();
	this.healthStatus.putText([s]);
    }
}
